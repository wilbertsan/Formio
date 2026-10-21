import { buildTextureRoller } from './buildTextureRoller'
import { serializeBuildResult } from './workerGeometry'
import type { TextureRollerParams } from './schema'
import type { ParsedSvg } from '../shared/svgToIconShape'

interface BuildRequest {
  id: number
  params: TextureRollerParams
  /** SVG achatado na main thread (o worker não tem DOMParser). */
  parsedSvg: ParsedSvg | null
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

scope.onmessage = (event) => {
  const { id, params, parsedSvg } = event.data
  const { data, transfer } = serializeBuildResult(buildTextureRoller({ params, parsedSvg }))
  scope.postMessage({ id, data }, transfer)
}
