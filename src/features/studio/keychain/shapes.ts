import { Path, Shape, Vector2 } from 'three'
import type { KeychainShape } from './schema'

export function createBaseShape(
  shapeType: KeychainShape,
  width: number,
  height: number,
  holeDiameter: number,
): Shape {
  const shape = buildOutline(shapeType, width, height)
  const holeCenter = getHolePosition(shapeType, width, height)
  const hole = new Path()
  hole.absarc(holeCenter.x, holeCenter.y, holeDiameter / 2, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

export function getHolePosition(
  shapeType: KeychainShape,
  width: number,
  height: number,
): Vector2 {
  switch (shapeType) {
    case 'rect':
      return new Vector2(0, height / 2 - 6)
    case 'circle':
      return new Vector2(0, width / 2 - 6)
    case 'heart':
      return new Vector2(0, height * 0.38)
  }
}

function buildOutline(shapeType: KeychainShape, width: number, height: number): Shape {
  switch (shapeType) {
    case 'rect':
      return rectShape(width, height)
    case 'circle':
      return circleShape(width)
    case 'heart':
      return heartShape(width, height)
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
