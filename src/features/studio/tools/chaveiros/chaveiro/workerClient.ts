import type { FontStyle, KeychainParams } from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import type { SerializedKeychainResult } from './workerGeometry'

export interface KeychainWorkerRequest {
  params: KeychainParams
  parsedSvgs: Record<string, ParsedSvg | null>
  styles: FontStyle[]
}

export interface KeychainWorker {
  build(
    request: KeychainWorkerRequest,
    onResult: (data: SerializedKeychainResult) => void,
    onError?: (message: string) => void,
  ): void
  terminate(): void
}

export function createKeychainWorker(): KeychainWorker {
  const worker = new Worker(new URL('./buildKeychain.worker.ts', import.meta.url), { type: 'module' })
  return {
    build(request, onResult, onError) {
      worker.onmessage = (event: MessageEvent<{ data?: SerializedKeychainResult; error?: string }>) => {
        if (event.data.error) onError?.(event.data.error)
        else if (event.data.data) onResult(event.data.data)
      }
      worker.onerror = () => onError?.('Falha ao gerar a peça')
      worker.postMessage(request)
    },
    terminate() {
      worker.terminate()
    },
  }
}
