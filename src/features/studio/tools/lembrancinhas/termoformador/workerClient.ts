import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import type { ThermoformerGeometryParams } from './schema'
import type { SerializedThermoformerResult } from './workerGeometry'

export interface ScreenWorker {
  build(
    params: ThermoformerGeometryParams,
    parsedSvg: ParsedSvg | null,
    onResult: (data: SerializedThermoformerResult) => void,
    onError?: (reason?: string) => void,
  ): void
  terminate(): void
}

type WorkerMessage =
  | { data: SerializedThermoformerResult }
  | { error: string }

export function createScreenWorker(): ScreenWorker {
  const worker = new Worker(
    new URL('./buildScreen.worker.ts', import.meta.url),
    { type: 'module' },
  )
  let terminated = false

  return {
    build(params, parsedSvg, onResult, onError) {
      if (terminated) {
        onError?.('terminated')
        return
      }
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        if ('error' in event.data) {
          onError?.(event.data.error)
          return
        }
        onResult(event.data.data)
      }
      worker.onerror = () => onError?.()
      worker.onmessageerror = () => onError?.()
      worker.postMessage({ params, parsedSvg })
    },
    terminate() {
      terminated = true
      worker.terminate()
    },
  }
}
