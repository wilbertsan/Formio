import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildPhotoStand } from './buildPhotoStand'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'
import { serializePhotoStandResult } from './workerGeometry'
import type { FontStyle, PhotoStandParams } from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'

interface BuildRequest {
  params: PhotoStandParams
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

    // O worker não tem DOMParser: SVGs precisam chegar já parseados pela main thread.
    const safeParsedSvgs = { ...parsedSvgs }
    for (const item of params.contents) {
      if (item.kind === 'icon' && item.svgIcon && safeParsedSvgs[item.id] === undefined) {
        safeParsedSvgs[item.id] = null
      }
    }

    const { data, transfer } = serializePhotoStandResult(
      buildPhotoStand({ params, fonts, parsedSvgs: safeParsedSvgs }),
    )
    scope.postMessage({ data }, transfer)
  } catch (error) {
    scope.postMessage({
      error: error instanceof Error ? error.message : 'Falha ao gerar a peça',
    })
  }
}
