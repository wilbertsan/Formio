import type { ParsedSvg } from '../shared/svgToIconShape'
import type { TextureRollerParams } from './schema'
import type { SerializedBuildResult } from './workerGeometry'

export interface GeometryWorker {
  build(
    params: TextureRollerParams,
    parsedSvg: ParsedSvg | null,
    onResult: (data: SerializedBuildResult) => void,
    onError?: () => void,
  ): void
  terminate(): void
}

/** Cria o Worker de geração de geometria (Vite worker module). */
export function createGeometryWorker(): GeometryWorker {
  const worker = new Worker(new URL('./buildTextureRoller.worker.ts', import.meta.url), { type: 'module' })

  return {
    build(params, parsedSvg, onResult, onError) {
      worker.onmessage = (event: MessageEvent<{ id: number; data: SerializedBuildResult }>) => {
        onResult(event.data.data)
      }
      worker.onerror = () => onError?.()
      worker.postMessage({ id: Date.now(), params, parsedSvg })
    },
    terminate() {
      worker.terminate()
    },
  }
}
