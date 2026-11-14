import type { ThermoformerGeometryParams } from './schema'
import type { SerializedGeometry } from './workerGeometry'

export interface ScreenWorker {
  build(
    params: ThermoformerGeometryParams,
    onResult: (data: SerializedGeometry) => void,
    onError?: () => void,
  ): void
  terminate(): void
}

export function createScreenWorker(): ScreenWorker {
  const worker = new Worker(
    new URL('./buildScreen.worker.ts', import.meta.url),
    { type: 'module' },
  )
  let terminated = false

  return {
    build(params, onResult, onError) {
      if (terminated) {
        onError?.()
        return
      }
      worker.onmessage = (event: MessageEvent<{ data: SerializedGeometry }>) => {
        onResult(event.data.data)
      }
      worker.onerror = () => onError?.()
      worker.onmessageerror = () => onError?.()
      worker.postMessage({ params })
    },
    terminate() {
      terminated = true
      worker.terminate()
    },
  }
}
