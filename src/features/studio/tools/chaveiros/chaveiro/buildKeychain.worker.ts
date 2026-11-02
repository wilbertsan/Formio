import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildKeychain } from './buildKeychain'
import { fontUrls } from './fonts'
import { serializeKeychainResult } from './workerGeometry'
import type { FontStyle, KeychainParams } from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'

interface BuildRequest {
  params: KeychainParams
  parsedSvgs: Record<string, ParsedSvg | null>
  styles: FontStyle[]
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

function loadFont(style: FontStyle): Promise<Font> {
  return new Promise((resolve, reject) => {
    new FontLoader().load(fontUrls[style], resolve, undefined, reject)
  })
}

scope.onmessage = async (event) => {
  try {
    const { params, parsedSvgs, styles } = event.data
    const fonts: Partial<Record<FontStyle, Font>> = {}
    const loaded = await Promise.all(styles.map(loadFont))
    styles.forEach((style, index) => {
      fonts[style] = loaded[index]
    })
    const { data, transfer } = serializeKeychainResult(
      buildKeychain({ params, fonts, parsedSvgs }),
    )
    scope.postMessage({ data }, transfer)
  } catch (error) {
    scope.postMessage({
      error: error instanceof Error ? error.message : 'Falha ao gerar a peça',
    })
  }
}
