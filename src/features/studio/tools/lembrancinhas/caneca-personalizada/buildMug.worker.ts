import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'
import { buildMug } from './buildMug'
import { serializeBuildResult } from './workerGeometry'
import type { FontStyle, MugGeometryParams } from './schema'

interface BuildRequest {
  id: number
  params: MugGeometryParams
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
  const { id, params } = event.data
  try {
    const font = await loadFont(params.fontStyle)
    const { data, transfer } = serializeBuildResult(buildMug(params, font))
    scope.postMessage({ id, data }, transfer)
  } catch {
    scope.postMessage({ id, error: true })
  }
}
