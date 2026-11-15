import { buildThermoformer } from './buildThermoformer'
import { serializeThermoformerResult } from './workerGeometry'
import type { ThermoformerGeometryParams } from './schema'

interface BuildRequest {
  params: ThermoformerGeometryParams
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

scope.onmessage = (event) => {
  const { params } = event.data
  const { data, transfer } = serializeThermoformerResult(buildThermoformer(params))
  scope.postMessage({ data }, transfer)
}
