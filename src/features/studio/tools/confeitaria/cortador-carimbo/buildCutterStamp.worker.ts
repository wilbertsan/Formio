import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildCutterStamp } from './buildCutterStamp'
import { serializeBuildResult } from './workerGeometry'
import type { CutterStampParams } from './schema'

interface BuildRequest {
  id: number
  params: CutterStampParams
  fontUrl: string | null
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

scope.onmessage = (event) => {
  const { id, params, fontUrl } = event.data

  const finish = (font: Font | null) => {
    const { data, transfer } = serializeBuildResult(buildCutterStamp({ params, font }))
    scope.postMessage({ id, data }, transfer)
  }

  if (params.contentType === 'text' && fontUrl) {
    new FontLoader().load(fontUrl, finish)
  } else {
    finish(null)
  }
}
