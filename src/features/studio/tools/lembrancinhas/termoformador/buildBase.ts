import type { BufferGeometry } from 'three'
import { buildRingShell } from './shell'
import type { ThermoformerGeometryParams } from './schema'

export function buildBase(params: ThermoformerGeometryParams): BufferGeometry {
  const innerWidth = params.width + 2 * params.printClearance
  const innerDepth = params.depth + 2 * params.printClearance
  const outerWidth = innerWidth + 2 * params.baseThickness
  const outerDepth = innerDepth + 2 * params.baseThickness

  const outerRadius = Math.min(
    params.baseCornerRadius,
    outerWidth / 2,
    outerDepth / 2,
  )
  const innerRadius = Math.max(
    0,
    Math.min(
      outerRadius - params.baseThickness,
      innerWidth / 2,
      innerDepth / 2,
    ),
  )

  return buildRingShell({
    outer: { width: outerWidth, depth: outerDepth, radius: outerRadius },
    inner: { width: innerWidth, depth: innerDepth, radius: innerRadius },
    height: Math.max(0.2, params.baseHeight),
    chamfer: params.edgeChamfer,
    segments: 256,
  })
}
