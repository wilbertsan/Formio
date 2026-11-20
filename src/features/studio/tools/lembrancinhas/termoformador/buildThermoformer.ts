import type { BufferGeometry } from 'three'
import { buildScreen } from './buildScreen'
import { buildSupport, getSupportDimensions } from './buildSupport'
import { buildPlug } from './buildPlug'
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
  return {
    screen: buildScreen(params),
    support: buildSupport(params),
    plug: buildPlug(params),
    seatY: getSupportDimensions(params).seatY,
  }
}
