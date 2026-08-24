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
const STACK_GAP = 2
const SUPPORT_FUSION = 0.5

export interface SnapContext {
  supports: Array<{ x: number; y: number; halfWidth: number; halfHeight: number }>
  pieceBB: BoundingBox2D
  hole?: Circle2D
}

export function defaultStackOffsets(heights: number[]): number[] {
  const total = heights.length
  if (total === 0) return []
  const step = () => {
    const tallest = Math.max(...heights)
    return tallest + STACK_GAP
  }
  return heights.map((_, index) => ((total - 1) / 2 - index) * step())
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

  let x = Math.min(maxX, Math.max(minX, text.x))
  let y = Math.min(maxY, Math.max(minY, text.y))

  const dx = x - hole.x
  const dy = y - hole.y
  const distance = Math.hypot(dx, dy)
  const minDistance = hole.radius + HOLE_CLEARANCE

  if (distance < minDistance && distance > 0.0001) {
    const push = minDistance / distance
    x = hole.x + dx * push
    y = hole.y + dy * push
    x = Math.min(maxX, Math.max(minX, x))
    y = Math.min(maxY, Math.max(minY, y))
  }

  return { x, y }
}

export function snapTextToSupport(
  text: TextPosition,
  context: SnapContext,
): { x: number; y: number } {
  const { supports, pieceBB, hole } = context
  const pieceTop = pieceBB.maxY - TEXT_BORDER_MIN
  let supportY = pieceTop

  for (const s of supports) {
    const sBottom = s.y - s.halfHeight
    if (sBottom < supportY && sBottom > pieceBB.minY) {
      supportY = sBottom
    }
  }

  if (hole && Math.abs(text.x - hole.x) < text.halfWidth + hole.radius) {
    const holeBottom = hole.y - hole.radius
    if (holeBottom < supportY && holeBottom > pieceBB.minY) {
      supportY = holeBottom
    }
  }

  const hasSupport = supportY !== pieceTop
  const fusion = hasSupport ? SUPPORT_FUSION : 0
  const y = supportY - text.halfHeight - fusion
  const minY = pieceBB.minY + text.halfHeight
  const x = clampTextPosition({ ...text, y }, pieceBB, hole ?? { x: 0, y: 100, radius: 0 }).x
  return { x, y: Math.max(minY, y) }
}