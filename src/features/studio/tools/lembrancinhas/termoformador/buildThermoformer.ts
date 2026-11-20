import type { BufferGeometry } from 'three'
import { buildScreen } from './buildScreen'
import { buildSupport, getSupportDimensions } from './buildSupport'
import { buildPlug } from './buildPlug'
import { getShapeOutline } from './outline'
import type { ThermoformerGeometryParams } from './schema'

export interface BuildThermoformerResult {
  screen: BufferGeometry
  support: BufferGeometry
  plug: BufferGeometry
  seatY: number
}

export function buildThermoformer(
  params: ThermoformerGeometryParams,
): BuildThermoformerResult {
  const outline = getShapeOutline(params)
  if (!outline) throw new Error('Contorno inválido para a forma selecionada')

  return {
    screen: buildScreen(params, outline),
    support: buildSupport(params),
    plug: buildPlug(params),
    seatY: getSupportDimensions(params).seatY,
  }
}
