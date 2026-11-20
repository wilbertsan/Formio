import { BufferGeometry, LatheGeometry, Vector2 } from 'three'
import { getSupportDimensions } from './buildSupport'
import { dedupeProfile, removeDegenerateTriangles } from './latheUtils'
import {
  PLUG_CHAMFER_MM,
  PLUG_DOME_SEGMENTS,
  SCREEN_SEGMENTS,
  type ThermoformerGeometryParams,
} from './schema'

export interface PlugDimensions {
  guideRadius: number
  contactRadius: number
  contactY: number
  bodyTop: number
  domeCenterY: number
  gripRadius: number
  gripDepth: number
  chamfer: number
  sphereRadius: number
  sphereCenterY: number
  height: number
}

export function getPlugDimensions(
  params: ThermoformerGeometryParams,
): PlugDimensions {
  const support = getSupportDimensions(params)
  const guideRadius = params.diameter / 2
  const contactRadius = support.cavityTopRadius
  const contactY = support.seatY + params.thickness
  const bodyTop = contactY + params.plugHeight
  const gripRadius = Math.min(
    params.plugHeight * 0.9,
    guideRadius * 0.4,
    30,
  )
  const gripDepth = Math.min(
    gripRadius * 1.2,
    support.effectiveBowlDepth + params.plugHeight - 6,
  )
  const chamfer = Math.min(
    PLUG_CHAMFER_MM,
    params.plugHeight * 0.3,
    guideRadius * 0.1,
  )

  return {
    guideRadius,
    contactRadius,
    contactY,
    bodyTop,
    domeCenterY:
      support.sphereCenterY + params.thickness - support.sphereRadius,
    gripRadius,
    gripDepth,
    chamfer,
    sphereRadius: support.sphereRadius,
    sphereCenterY: support.sphereCenterY,
    height: support.effectiveBowlDepth + params.plugHeight,
  }
}

export function buildPlugProfile(
  params: ThermoformerGeometryParams,
): Vector2[] {
  const dims = getPlugDimensions(params)
  const points: Vector2[] = [new Vector2(0, dims.domeCenterY)]

  for (let index = 1; index <= PLUG_DOME_SEGMENTS; index++) {
    const radius = dims.contactRadius * (index / PLUG_DOME_SEGMENTS)
    const y = dims.sphereCenterY + params.thickness
      - Math.sqrt(Math.max(0, dims.sphereRadius ** 2 - radius ** 2))
    points.push(new Vector2(radius, y))
  }

  points.push(new Vector2(dims.guideRadius, dims.contactY))
  points.push(new Vector2(dims.guideRadius, dims.bodyTop - dims.chamfer))
  if (dims.chamfer > 0) {
    points.push(new Vector2(dims.guideRadius - dims.chamfer, dims.bodyTop))
  }
  points.push(new Vector2(dims.gripRadius, dims.bodyTop))
  points.push(new Vector2(0, dims.bodyTop - dims.gripDepth))

  return dedupeProfile(points)
}

export function buildPlug(
  params: ThermoformerGeometryParams,
): BufferGeometry {
  const geometry = new LatheGeometry(
    buildPlugProfile(params),
    SCREEN_SEGMENTS,
  )
  return removeDegenerateTriangles(geometry)
}
