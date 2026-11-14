import { describe, it, expect } from 'vitest'
import type { Path, Vector2 } from 'three'
import {
  circleShape,
  hexagonPath,
} from '@/features/studio/tools/lembrancinhas/termoformador/shapes'

/** `getPoints` repete as junções; remove duplicatas consecutivas e o fechamento. */
function vertices(path: Path): Vector2[] {
  const unique: Vector2[] = []
  for (const point of path.getPoints(1)) {
    const last = unique[unique.length - 1]
    if (!last || last.distanceTo(point) > 1e-6) unique.push(point)
  }
  if (unique.length > 1 && unique[0].distanceTo(unique[unique.length - 1]) <= 1e-6) {
    unique.pop()
  }
  return unique
}

describe('shapes', () => {
  it('círculo amostrado mantém o raio', () => {
    const points = circleShape(10).getPoints(64)
    expect(points.length).toBeGreaterThanOrEqual(32)
    for (const point of points) {
      expect(Math.hypot(point.x, point.y)).toBeCloseTo(10, 3)
    }
  })

  it('hexágono tem seis vértices no raio pedido', () => {
    const points = vertices(hexagonPath(4, -3, 2))
    expect(points).toHaveLength(6)
    for (const point of points) {
      expect(Math.hypot(point.x - 4, point.y + 3)).toBeCloseTo(2, 5)
    }
    const angles = points.map((point) => Math.atan2(point.y + 3, point.x - 4))
    expect(new Set(angles.map((angle) => angle.toFixed(4))).size).toBe(6)
  })

  it('hexágono tem seis lados iguais', () => {
    const path = hexagonPath(0, 0, 2)
    expect(path.curves).toHaveLength(6)
    const points = vertices(path)
    expect(points).toHaveLength(6)
    const sides = points.map((point, index) =>
      point.distanceTo(points[(index + 1) % points.length]),
    )
    for (const side of sides) expect(side).toBeCloseTo(2, 5)
  })
})
