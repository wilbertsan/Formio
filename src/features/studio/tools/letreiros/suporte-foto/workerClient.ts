import type { FontStyle, PhotoStandParams } from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import type { SerializedPhotoStandResult } from './workerGeometry'

export interface PhotoStandWorkerRequest {
  params: PhotoStandParams
  parsedSvgs: Record<string, ParsedSvg | null>
  styles: FontStyle[]
}

export interface PhotoStandWorker {
  build(
    request: PhotoStandWorkerRequest,
    onResult: (data: SerializedPhotoStandResult) => void,
    onError?: (message: string) => void,
  ): void
  terminate(): void
}

export function createPhotoStandWorker(): PhotoStandWorker {
  const worker = new Worker(new URL('./buildPhotoStand.worker.ts', import.meta.url), { type: 'module' })
  let terminated = false
  return {
    build(request, onResult, onError) {
      if (terminated) {
        onError?.('Worker encerrado')
        return
      }
      worker.onmessage = (event: MessageEvent<{ data?: SerializedPhotoStandResult; error?: string }>) => {
        if (event.data.error) onError?.(event.data.error)
        else if (event.data.data) onResult(event.data.data)
      }
      worker.onerror = () => onError?.('Falha ao gerar a peça')
      worker.onmessageerror = () => onError?.('Falha ao gerar a peça')
      worker.postMessage(request)
    },
    terminate() {
      terminated = true
      worker.terminate()
    },
  }
}
