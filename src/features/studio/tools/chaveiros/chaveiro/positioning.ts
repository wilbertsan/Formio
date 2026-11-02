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

function clearanceRequirement(text: TextPosition, hole: Circle2D, cx: number, cy: number): number {
  const dx = cx - hole.x
  const dy = cy - hole.y
  const distance = Math.hypot(dx, dy)
  const extent = distance > 0.0001
    ? (Math.abs(dx) * text.halfWidth + Math.abs(dy) * text.halfHeight) / distance
    : 0
  return hole.radius + HOLE_CLEARANCE + extent
}

function satisfies(text: TextPosition, hole: Circle2D, x: number, y: number): boolean {
  return Math.hypot(x - hole.x, y - hole.y) >= clearanceRequirement(text, hole, x, y) - 0.001
}

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

  const clamp = (x: number, y: number): { x: number; y: number } => ({
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  })

  const requested = clamp(text.x, text.y)
  if (satisfies(text, hole, requested.x, requested.y)) return requested

  const dx = requested.x - hole.x
  const dy = requested.y - hole.y
  const distance = Math.hypot(dx, dy)
  const requirement = clearanceRequirement(text, hole, requested.x, requested.y)
  const radial = distance > 0.0001
    ? clamp(hole.x + dx * (requirement / distance), hole.y + dy * (requirement / distance))
    : clamp(hole.x, hole.y + requirement)

  if (satisfies(text, hole, radial.x, radial.y)) return radial

  const vertical = hole.radius + HOLE_CLEARANCE + text.halfHeight
  const horizontal = hole.radius + HOLE_CLEARANCE + text.halfWidth
  const candidates = [
    clamp(hole.x, hole.y + vertical),
    clamp(hole.x, hole.y - vertical),
    clamp(hole.x + horizontal, hole.y),
    clamp(hole.x - horizontal, hole.y),
  ]

  for (const candidate of candidates) {
    if (satisfies(text, hole, candidate.x, candidate.y)) return candidate
  }

  return radial
}
