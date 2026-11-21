import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import { buildThermoformer } from './buildThermoformer'
import { serializeThermoformerResult } from './workerGeometry'
import type { ThermoformerGeometryParams } from './schema'

interface BuildRequest {
  params: ThermoformerGeometryParams
  parsedSvg: ParsedSvg | null
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

scope.onmessage = (event) => {
  const { params, parsedSvg } = event.data
  const result = buildThermoformer(params, parsedSvg)
  if (!result) {
    scope.postMessage({ error: 'invalid-outline' })
    return
  }
  const { data, transfer } = serializeThermoformerResult(result)
  scope.postMessage({ data }, transfer)
}
