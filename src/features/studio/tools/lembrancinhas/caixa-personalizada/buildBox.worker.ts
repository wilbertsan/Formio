import { buildBox } from './buildBox'
import { serializeBuildResult } from './workerGeometry'
import type { BoxGeometryParams } from './schema'

interface BuildRequest {
  id: number
  params: BoxGeometryParams
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

scope.onmessage = (event) => {
  const { id, params } = event.data
  const { data, transfer } = serializeBuildResult(buildBox(params))
  scope.postMessage({ id, data }, transfer)
}
