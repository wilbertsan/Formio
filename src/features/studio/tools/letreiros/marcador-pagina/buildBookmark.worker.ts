import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import { buildBookmark } from './buildBookmark'
import { fontUrls } from './fonts'
import { serializeBookmarkResult } from './workerGeometry'
import type { BookmarkParams, FontStyle } from './schema'

interface BuildRequest {
  params: BookmarkParams
  styles: FontStyle[]
  parsedSvg: ParsedSvg | null
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
    const { params, styles, parsedSvg } = event.data
    const fonts: Partial<Record<FontStyle, Font>> = {}
    const loaded = await Promise.all(styles.map(loadFont))
    styles.forEach((style, index) => {
      fonts[style] = loaded[index]
    })
    const { data, transfer } = serializeBookmarkResult(
      buildBookmark({ fonts, params, parsedSvg }),
    )
    scope.postMessage({ data }, transfer)
  } catch (error) {
    scope.postMessage({
      error: error instanceof Error ? error.message : 'Falha ao gerar a peça',
    })
  }
}
