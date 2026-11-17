import type { MugGeometryParams } from './schema'
import type { MugWorkerResponse, SerializedBuildResult } from './workerGeometry'

export interface MugWorker {
  build(
    params: MugGeometryParams,
    onResult: (data: SerializedBuildResult) => void,
    onError?: (message?: string) => void,
  ): void
  terminate(): void
}

export function createMugWorker(): MugWorker {
  const worker = new Worker(
    new URL('./buildMug.worker.ts', import.meta.url),
    { type: 'module' },
  )
  let terminated = false
  let latestId = 0

  return {
    build(params, onResult, onError) {
      if (terminated) {
        onError?.()
        return
      }
      const id = ++latestId
      worker.onmessage = (event: MessageEvent<MugWorkerResponse>) => {
        // Um build mais novo já foi pedido: descarta a resposta atrasada.
        if (event.data.id !== id || event.data.id !== latestId) return
        if (event.data.error) {
          onError?.(event.data.error)
          return
        }
        if (!event.data.data) {
          onError?.()
          return
        }
        onResult(event.data.data)
      }
      worker.onerror = () => onError?.()
      worker.onmessageerror = () => onError?.()
      worker.postMessage({ id, params })
    },
    terminate() {
      terminated = true
      worker.terminate()
    },
  }
}
