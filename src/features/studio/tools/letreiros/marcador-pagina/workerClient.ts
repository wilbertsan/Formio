import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import type { BookmarkParams, FontStyle } from './schema'
import type { SerializedBookmarkResult } from './workerGeometry'

export interface BookmarkWorkerRequest {
  params: BookmarkParams
  styles: FontStyle[]
  parsedSvg: ParsedSvg | null
}

export interface BookmarkWorker {
  build(
    request: BookmarkWorkerRequest,
    onResult: (data: SerializedBookmarkResult) => void,
    onError?: (message: string) => void,
  ): void
  terminate(): void
}

// Um worker por build: o hook encerra o anterior antes de criar outro.
export function createBookmarkWorker(): BookmarkWorker {
  const worker = new Worker(new URL('./buildBookmark.worker.ts', import.meta.url), {
    type: 'module',
  })
  let terminated = false
  return {
    build(request, onResult, onError) {
      if (terminated) {
        onError?.('Worker encerrado')
        return
      }
      worker.onmessage = (
        event: MessageEvent<{ data?: SerializedBookmarkResult; error?: string }>,
      ) => {
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
