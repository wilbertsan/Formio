import type { ThermoformerGeometryParams } from './schema'
import type { SerializedBuildResult } from './workerGeometry'

export interface ThermoformerWorker {
  build(
    params: ThermoformerGeometryParams,
    onResult: (data: SerializedBuildResult) => void,
    onError?: () => void,
  ): void
  terminate(): void
}

export function createThermoformerWorker(): ThermoformerWorker {
  const worker = new Worker(
    new URL('./buildThermoformer.worker.ts', import.meta.url),
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
