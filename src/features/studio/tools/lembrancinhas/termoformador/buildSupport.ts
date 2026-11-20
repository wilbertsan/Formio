import { BufferGeometry, LatheGeometry, Vector2 } from 'three'
import {
  MINIMUM_SUPPORT_MM,
  SCREEN_SEGMENTS,
  type ThermoformerGeometryParams,
} from './schema'
import { dedupeProfile, removeDegenerateTriangles } from './latheUtils'

export interface SupportDimensions {
  outerRadius: number
  height: number
  seatY: number
  recessRadius: number
  cavityTopRadius: number
  sphereRadius: number
  sphereCenterY: number
  ledgeOverlap: number
  effectiveBowlDepth: number
  cavityWall: number
  bowlDepthLimited: boolean
}

const CAVITY_SEGMENTS = 32

export function getSupportDimensions(
  params: ThermoformerGeometryParams,
): SupportDimensions {
  const screenRadius = params.diameter / 2
  const recessRadius = screenRadius + params.fitClearance
  const outerRadius = recessRadius + params.wallThickness
  const requestedDepth = Math.max(0.1, params.bowlDepth)
  const requestedTop = Math.max(0.1, recessRadius - params.stepWidth)
  const maxCavityRadius = Math.max(0.1, outerRadius - MINIMUM_SUPPORT_MM)
  const requestedSphereRadius =
    (requestedTop ** 2 + requestedDepth ** 2) / (2 * requestedDepth)

  const depthLimit = requestedSphereRadius > maxCavityRadius
    ? maxCavityRadius
      + Math.sqrt(Math.max(0, maxCavityRadius ** 2 - requestedTop ** 2))
    : requestedDepth
  // A bacia não pode passar da abertura: acima da semi-esfera ela vira
  // sobrequeda e o macho não poderia ser inserido/retirado.
  const effectiveBowlDepth = Math.min(requestedDepth, depthLimit, requestedTop)
  const bowlDepthLimited = effectiveBowlDepth < requestedDepth - 1e-9

  const seatY = effectiveBowlDepth + params.bottomThickness
  const height = params.thickness + effectiveBowlDepth + params.bottomThickness
  const cavityTopRadius = requestedTop
  const sphereRadius =
    (cavityTopRadius ** 2 + effectiveBowlDepth ** 2)
    / (2 * effectiveBowlDepth)
  const sphereCenterY = params.bottomThickness + sphereRadius
  const cavityMaxRadius = effectiveBowlDepth >= sphereRadius
    ? sphereRadius
    : cavityTopRadius
  const cavityWall = outerRadius - cavityMaxRadius
  const ledgeOverlap = screenRadius - cavityTopRadius

  return {
    outerRadius,
    height,
    seatY,
    recessRadius,
    cavityTopRadius,
    sphereRadius,
    sphereCenterY,
    ledgeOverlap,
    effectiveBowlDepth,
    cavityWall,
    bowlDepthLimited,
  }
}

export function buildSupportProfile(
  params: ThermoformerGeometryParams,
): Vector2[] {
  const dims = getSupportDimensions(params)
  const chamfer = Math.max(
    0,
    Math.min(
      params.edgeChamfer,
      params.wallThickness * 0.5,
      params.bottomThickness * 0.5,
      dims.height * 0.2,
    ),
  )

  const points: Vector2[] = [
    new Vector2(0, 0),
    new Vector2(dims.outerRadius - chamfer, 0),
  ]

  if (chamfer > 0) points.push(new Vector2(dims.outerRadius, chamfer))
  points.push(new Vector2(dims.outerRadius, dims.height - chamfer))
  if (chamfer > 0) {
    points.push(new Vector2(dims.outerRadius - chamfer, dims.height))
  }
  points.push(new Vector2(dims.recessRadius, dims.height))
  points.push(new Vector2(dims.recessRadius, dims.seatY))
  points.push(new Vector2(dims.cavityTopRadius, dims.seatY))

  const phiTop = Math.asin(
    Math.max(
      -1,
      Math.min(1, (dims.seatY - dims.sphereCenterY) / dims.sphereRadius),
    ),
  )
  const phiBottom = -Math.PI / 2

  for (let index = 1; index < CAVITY_SEGMENTS; index++) {
    const phi = phiTop + (phiBottom - phiTop) * (index / CAVITY_SEGMENTS)
    points.push(new Vector2(
      Math.max(0, dims.sphereRadius * Math.cos(phi)),
      dims.sphereCenterY + dims.sphereRadius * Math.sin(phi),
    ))
  }

  points.push(new Vector2(0, params.bottomThickness))

  return dedupeProfile(points)
}

export function buildSupport(
  params: ThermoformerGeometryParams,
): BufferGeometry {
  const geometry = new LatheGeometry(
    buildSupportProfile(params),
    SCREEN_SEGMENTS,
  )
  return removeDegenerateTriangles(geometry)
}
