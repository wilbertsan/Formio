import { TEXT_BORDER_MIN } from './schema'

export interface TextPosition {
  x: number
  y: number
  halfWidth: number
  halfHeight: number
}

export interface BoundingBox2D {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface Circle2D {
  x: number
  y: number
  radius: number
}

const HOLE_CLEARANCE = 1

export function clampTextPosition(
  text: TextPosition,
  pieceBB: BoundingBox2D,
  hole: Circle2D,
): { x: number; y: number } {
  const minX = pieceBB.minX + TEXT_BORDER_MIN + text.halfWidth
  const maxX = pieceBB.maxX - TEXT_BORDER_MIN - text.halfWidth
  const minY = pieceBB.minY + TEXT_BORDER_MIN + text.halfHeight
  const maxY = pieceBB.maxY - TEXT_BORDER_MIN - text.halfHeight

  if (minX > maxX || minY > maxY) {
    return { x: (pieceBB.minX + pieceBB.maxX) / 2, y: (pieceBB.minY + pieceBB.maxY) / 2 }
  }

  let x = Math.min(maxX, Math.max(minX, text.x))
  let y = Math.min(maxY, Math.max(minY, text.y))

  const dx = x - hole.x
  const dy = y - hole.y
  const distance = Math.hypot(dx, dy)
  const extent = distance > 0.0001
    ? (Math.abs(dx) * text.halfWidth + Math.abs(dy) * text.halfHeight) / distance
    : 0
  const minDistance = hole.radius + HOLE_CLEARANCE + extent

  if (distance < minDistance) {
    if (distance > 0.0001) {
      const push = minDistance / distance
      x = hole.x + dx * push
      y = hole.y + dy * push
    } else {
      x = hole.x
      y = hole.y + minDistance
    }
    x = Math.min(maxX, Math.max(minX, x))
    y = Math.min(maxY, Math.max(minY, y))
  }

  return { x, y }
}