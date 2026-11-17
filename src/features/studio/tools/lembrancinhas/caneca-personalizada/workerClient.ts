import type { MugGeometryParams } from './schema'
import type { SerializedBuildResult } from './workerGeometry'

export interface MugWorker {
  build(
    params: MugGeometryParams,
    onResult: (data: SerializedBuildResult) => void,
    onError?: () => void,
  ): void
  terminate(): void
}

export function createMugWorker(): MugWorker {
  const worker = new Worker(
    new URL('./buildMug.worker.ts', import.meta.url),
    { type: 'module' },
  )
  let terminated = false

  return {
    build(params, onResult, onError) {
      if (terminated) {
        onError?.()
        return
      }
      worker.onmessage = (
        event: MessageEvent<{ id: number; data?: SerializedBuildResult; error?: boolean }>,
      ) => {
        if (event.data.error || !event.data.data) {
          onError?.()
          return
        }
        onResult(event.data.data)
      }
      worker.onerror = () => onError?.()
      worker.onmessageerror = () => onError?.()
      worker.postMessage({ id: Date.now(), params })
    },
    terminate() {
      terminated = true
      worker.terminate()
    },
  }
}
