import type { CardParams, FontStyle } from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import type { SerializedCardResult } from './workerGeometry'

export interface CardWorkerRequest {
  params: CardParams
  parsedSvgs: Record<string, ParsedSvg | null>
  styles: FontStyle[]
}

export interface CardWorker {
  build(
    request: CardWorkerRequest,
    onResult: (data: SerializedCardResult) => void,
    onError?: (message: string) => void,
  ): void
  terminate(): void
}

export function createCardWorker(): CardWorker {
  const worker = new Worker(new URL('./buildCard.worker.ts', import.meta.url), { type: 'module' })
  let terminated = false
  return {
    build(request, onResult, onError) {
      if (terminated) {
        onError?.('Worker encerrado')
        return
      }
      worker.onmessage = (event: MessageEvent<{ data?: SerializedCardResult; error?: string }>) => {
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
