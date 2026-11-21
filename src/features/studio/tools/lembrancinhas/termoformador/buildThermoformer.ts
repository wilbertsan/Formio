import type { BufferGeometry } from 'three'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import { buildScreen } from './buildScreen'
import { buildSupport, getSupportDimensions } from './buildSupport'
import { buildPlug } from './buildPlug'
import { getShapeOutline } from './outline'
import { getTrayDimensions } from './tray'
import type { ThermoformerGeometryParams } from './schema'

export interface BuildThermoformerResult {
  screen: BufferGeometry
  support: BufferGeometry
  plug: BufferGeometry
  seatY: number
}

export function buildThermoformer(
  params: ThermoformerGeometryParams,
  parsedSvg?: ParsedSvg | null,
): BuildThermoformerResult | null {
  const outline = getShapeOutline(params, parsedSvg)
  if (!outline) return null
  const dims = params.shape === 'circle'
    ? getSupportDimensions(params)
    : getTrayDimensions(params, outline)

  return {
    screen: buildScreen(params, outline),
    support: buildSupport(params, outline),
    plug: buildPlug(params, outline),
    seatY: dims.seatY,
  }
}
