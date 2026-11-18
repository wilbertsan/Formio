import type { CanHolderGeometryParams } from './schema'
import type {
  CanHolderErrorCode,
  CanHolderWorkerResponse,
  SerializedBuildResult,
} from './workerGeometry'

export interface CanHolderWorker {
  build(
    params: CanHolderGeometryParams,
    onResult: (data: SerializedBuildResult) => void,
    onError?: (code?: CanHolderErrorCode) => void,
  ): void
  terminate(): void
}

export function createCanHolderWorker(): CanHolderWorker {
  const worker = new Worker(
    new URL('./buildCanHolder.worker.ts', import.meta.url),
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
      worker.onmessage = (event: MessageEvent<CanHolderWorkerResponse>) => {
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
