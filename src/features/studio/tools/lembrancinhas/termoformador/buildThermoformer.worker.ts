import { buildThermoformer } from './buildThermoformer'
import { serializeBuildResult } from './workerGeometry'
import type { ThermoformerGeometryParams } from './schema'

interface BuildRequest {
  id: number
  params: ThermoformerGeometryParams
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

scope.onmessage = (event) => {
  const { id, params } = event.data
  const { data, transfer } = serializeBuildResult(buildThermoformer(params))
  scope.postMessage({ id, data }, transfer)
}
