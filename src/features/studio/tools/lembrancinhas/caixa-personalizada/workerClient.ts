import type { BoxGeometryParams } from './schema'
import type { SerializedBuildResult } from './workerGeometry'

export interface BoxWorker {
  build(
    params: BoxGeometryParams,
    onResult: (data: SerializedBuildResult) => void,
    onError?: () => void,
  ): void
  terminate(): void
}

export function createBoxWorker(): BoxWorker {
  const worker = new Worker(
    new URL('./buildBox.worker.ts', import.meta.url),
    { type: 'module' },
  )

  return {
    build(params, onResult, onError) {
      worker.onmessage = (event: MessageEvent<{ id: number; data: SerializedBuildResult }>) => {
        onResult(event.data.data)
      }
      worker.onerror = () => onError?.()
      worker.postMessage({ id: Date.now(), params })
    },
    terminate() {
      worker.terminate()
    },
  }
}
