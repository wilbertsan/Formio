import type { CutterStampParams } from './schema'
import type { SerializedBuildResult } from './workerGeometry'

export interface GeometryWorker {
  build(
    params: CutterStampParams,
    fontUrl: string | null,
    onResult: (data: SerializedBuildResult) => void,
    onError?: () => void,
  ): void
  terminate(): void
}

/** Cria o Worker de geração de geometria (Vite worker module). */
export function createGeometryWorker(): GeometryWorker {
  const worker = new Worker(new URL('./buildCutterStamp.worker.ts', import.meta.url), { type: 'module' })

  return {
    build(params, fontUrl, onResult, onError) {
      worker.onmessage = (event: MessageEvent<{ id: number; data: SerializedBuildResult }>) => {
        onResult(event.data.data)
      }
      worker.onerror = () => onError?.()
      worker.postMessage({ id: Date.now(), params, fontUrl })
    },
    terminate() {
      worker.terminate()
    },
  }
}
