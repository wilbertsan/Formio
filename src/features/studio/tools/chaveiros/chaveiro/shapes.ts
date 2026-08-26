import { Box3, Path, Shape, Vector2 } from 'three'
import { RING_EDGE_MARGIN, type KeychainShape, type RingPosition } from './schema'

export const RING_WALL = 2

export interface RingParams {
  position: RingPosition
  innerDiameter: number
  embedding: number
  lateralOffset: number
  radialOffset: number
}

export function createBaseShape(
  shapeType: KeychainShape,
  width: number,
  height: number,
  ring: RingParams,
): Shape {
  const shape = buildOutline(shapeType, width, height)
  const center = getRingPosition(shapeType, width, height, ring)
  const clamped = clampToBoundingBox(shape, center, ring.innerDiameter / 2)
  const hole = new Path()
  hole.absarc(clamped.x, clamped.y, ring.innerDiameter / 2, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

export function getRingPosition(
  shapeType: KeychainShape,
  width: number,
  height: number,
  ring: RingParams,
): Vector2 {
  const half = { x: width / 2, y: height / 2 }
  const radius = ring.innerDiameter / 2
  const inset = RING_EDGE_MARGIN + radius + ring.radialOffset + ring.embedding

  switch (ring.position) {
    case 'top':
      return new Vector2(ring.lateralOffset, half.y - inset)
    case 'bottom':
      return new Vector2(ring.lateralOffset, -half.y + inset)
    case 'right':
      return new Vector2(half.x - inset, ring.lateralOffset)
    case 'left':
      return new Vector2(-half.x + inset, ring.lateralOffset)
  }
}

function clampToBoundingBox(
  shape: Shape,
  center: Vector2,
  holeRadius: number,
): Vector2 {
  const bb = new Box3().setFromPoints(shape.getPoints(64).map(p => ({ x: p.x, y: p.y, z: 0 })))
  const minX = bb.min.x + RING_EDGE_MARGIN + holeRadius
  const maxX = bb.max.x - RING_EDGE_MARGIN - holeRadius
  const minY = bb.min.y + RING_EDGE_MARGIN + holeRadius
  const maxY = bb.max.y - RING_EDGE_MARGIN - holeRadius
  return new Vector2(
    Math.max(minX, Math.min(maxX, center.x)),
    Math.max(minY, Math.min(maxY, center.y)),
  )
}

export function createReinforcementRing(ring: RingParams): Shape {
  const outerRadius = ring.innerDiameter / 2 + RING_WALL
  const shape = new Shape()
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false)
  const hole = new Path()
  hole.absarc(0, 0, ring.innerDiameter / 2, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

function buildOutline(shapeType: KeychainShape, width: number, height: number): Shape {
  switch (shapeType) {
    case 'rect': return rectShape(width, height)
    case 'circle': return circleShape(width)
    case 'heart': return heartShape(width, height)
    default: return rectShape(width, height)
  }
}

function rectShape(width: number, height: number): Shape {
  const radius = Math.min(3, width / 4, height / 4)
  const w = width / 2
  const h = height / 2
  const shape = new Shape()
  shape.moveTo(-w + radius, -h)
  shape.lineTo(w - radius, -h)
  shape.quadraticCurveTo(w, -h, w, -h + radius)
  shape.lineTo(w, h - radius)
  shape.quadraticCurveTo(w, h, w - radius, h)
  shape.lineTo(-w + radius, h)
  shape.quadraticCurveTo(-w, h, -w, h - radius)
  shape.lineTo(-w, -h + radius)
  shape.quadraticCurveTo(-w, -h, -w + radius, -h)
  return shape
}

function circleShape(diameter: number): Shape {
  const shape = new Shape()
  shape.absarc(0, 0, diameter / 2, 0, Math.PI * 2, false)
  return shape
}

function heartShape(width: number, height: number): Shape {
  const s = Math.min(width / 16, height / 14)
  const shape = new Shape()
  shape.moveTo(0, 5 * s)
  shape.bezierCurveTo(5 * s, 12 * s, 12 * s, 6 * s, 12 * s, 0)
  shape.bezierCurveTo(12 * s, -6 * s, 6 * s, -9 * s, 0, -14 * s)
  shape.bezierCurveTo(-6 * s, -9 * s, -12 * s, -6 * s, -12 * s, 0)
  shape.bezierCurveTo(-12 * s, 6 * s, -5 * s, 12 * s, 0, 5 * s)
  return shape
}
