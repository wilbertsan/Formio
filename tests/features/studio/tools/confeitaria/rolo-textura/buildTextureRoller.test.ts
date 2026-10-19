import { describe, it, expect } from 'vitest'
import type { BufferGeometry } from 'three'
import { buildTextureRoller } from '@/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller'
import { defaultTextureRollerParams, HANDLE_LENGTH_MM } from '@/features/studio/tools/confeitaria/rolo-textura/schema'

function radiusAt(geometry: BufferGeometry, i: number): number {
  const pos = geometry.getAttribute('position')
  return Math.hypot(pos.getY(i), pos.getZ(i))
}

function maxRadius(geometry: BufferGeometry): number {
  const pos = geometry.getAttribute('position')
  let max = 0
  for (let i = 0; i < pos.count; i++) max = Math.max(max, radiusAt(geometry, i))
  return max
}

function isClosed(geometry: BufferGeometry): boolean {
  const index = geometry.getIndex()
  if (!index) return false
  const edges = new Map<string, number>()
  for (let t = 0; t < index.count; t += 3) {
    const v = [index.getX(t), index.getX(t + 1), index.getX(t + 2)]
    for (let k = 0; k < 3; k++) {
      const a = v[k]
      const b = v[(k + 1) % 3]
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      edges.set(key, (edges.get(key) ?? 0) + 1)
    }
  }
  for (const count of edges.values()) if (count !== 2) return false
  return true
}

describe('buildTextureRoller', () => {
  it('gera malha indexada com vértices e dois grupos de material', () => {
    const { roller } = buildTextureRoller({ params: defaultTextureRollerParams })
    expect(roller.getAttribute('position').count).toBeGreaterThan(1000)
    expect(roller.getIndex()).not.toBeNull()
    expect(roller.groups).toHaveLength(2)
    expect(roller.groups[1].count).toBeGreaterThan(0)
  })

  it('dimensões: comprimento total inclui cabos; raio máximo = D/2 + profundidade', () => {
    const { roller } = buildTextureRoller({ params: defaultTextureRollerParams })
    roller.computeBoundingBox()
    const bb = roller.boundingBox!
    expect(bb.max.x - bb.min.x).toBeCloseTo(defaultTextureRollerParams.length + 2 * HANDLE_LENGTH_MM, 0)
    expect(maxRadius(roller)).toBeCloseTo(defaultTextureRollerParams.diameter / 2 + defaultTextureRollerParams.reliefDepth, 1)
  })

  it('malha é fechada (cada aresta em 2 triângulos)', () => {
    const { roller } = buildTextureRoller({ params: defaultTextureRollerParams })
    expect(isClosed(roller)).toBe(true)
  })

  it('normais apontam para fora no corpo', () => {
    const { roller } = buildTextureRoller({ params: defaultTextureRollerParams })
    const pos = roller.getAttribute('position')
    const normal = roller.getAttribute('normal')
    let checked = 0
    for (let i = 0; i < pos.count; i += 97) {
      if (Math.abs(pos.getX(i)) > defaultTextureRollerParams.length / 2) continue
      const radial = { y: pos.getY(i), z: pos.getZ(i) }
      if (Math.hypot(radial.y, radial.z) < 1) continue
      const dot = normal.getY(i) * radial.y + normal.getZ(i) * radial.z
      expect(dot).toBeGreaterThan(0)
      checked++
    }
    expect(checked).toBeGreaterThan(10)
  })

  it('respeita dimensões mínimas e máximas', () => {
    const small = buildTextureRoller({ params: { ...defaultTextureRollerParams, length: 50, diameter: 20 } }).roller
    small.computeBoundingBox()
    expect(small.boundingBox!.max.x - small.boundingBox!.min.x).toBeCloseTo(50 + 2 * HANDLE_LENGTH_MM, 0)
    const large = buildTextureRoller({ params: { ...defaultTextureRollerParams, length: 150, diameter: 40 } }).roller
    large.computeBoundingBox()
    expect(large.boundingBox!.max.x - large.boundingBox!.min.x).toBeCloseTo(150 + 2 * HANDLE_LENGTH_MM, 0)
  })
})
