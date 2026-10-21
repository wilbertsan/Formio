import { describe, it, expect } from 'vitest'
import type { BufferGeometry } from 'three'
import { buildBody } from '@/features/studio/tools/confeitaria/rolo-textura/buildBody'
import { defaultTextureRollerParams } from '@/features/studio/tools/confeitaria/rolo-textura/schema'

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

function dimensions(geometry: BufferGeometry): { length: number; height: number; width: number } {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  return {
    length: bb.max.x - bb.min.x,
    height: bb.max.y - bb.min.y,
    width: bb.max.z - bb.min.z,
  }
}

describe('buildBody', () => {
  it('gera geometria indexada sem uv nem grupos', () => {
    const geometry = buildBody(defaultTextureRollerParams)
    expect(geometry.getAttribute('position').count).toBeGreaterThan(1000)
    expect(geometry.getAttribute('normal').count).toBe(geometry.getAttribute('position').count)
    expect(geometry.getIndex()).not.toBeNull()
    expect(geometry.getAttribute('uv')).toBeUndefined()
    expect(geometry.groups).toHaveLength(0)
  })

  it('dimensões: length x diameter x diameter', () => {
    const geometry = buildBody(defaultTextureRollerParams)
    const { length, height, width } = dimensions(geometry)
    expect(length).toBeCloseTo(defaultTextureRollerParams.length, 0)
    expect(height).toBeCloseTo(defaultTextureRollerParams.diameter, 0)
    expect(width).toBeCloseTo(defaultTextureRollerParams.diameter, 0)
  })

  it('malha é fechada (cada aresta em 2 triângulos)', () => {
    const geometry = buildBody(defaultTextureRollerParams)
    expect(isClosed(geometry)).toBe(true)
  })

  it('normais apontam para fora no corpo', () => {
    const params = defaultTextureRollerParams
    const geometry = buildBody(params)
    const pos = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    let checked = 0
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getX(i)) >= params.length / 2) continue
      const y = pos.getY(i)
      const z = pos.getZ(i)
      if (Math.hypot(y, z) < 1) continue
      const dot = normal.getY(i) * y + normal.getZ(i) * z
      expect(dot).toBeGreaterThan(0)
      checked++
    }
    expect(checked).toBeGreaterThan(10)
  })

  it('não tem cabos laterais: comprimento total igual ao length', () => {
    const params = defaultTextureRollerParams
    const geometry = buildBody(params)
    geometry.computeBoundingBox()
    const bb = geometry.boundingBox!
    expect(bb.max.x).toBeCloseTo(params.length / 2, 1)
    expect(bb.min.x).toBeCloseTo(-params.length / 2, 1)
  })

  it('respeita dimensões mínimas e máximas', () => {
    const small = buildBody({ ...defaultTextureRollerParams, length: 50, diameter: 20 })
    const smallDims = dimensions(small)
    expect(smallDims.length).toBeCloseTo(50, 0)
    expect(smallDims.height).toBeCloseTo(20, 0)
    expect(smallDims.width).toBeCloseTo(20, 0)
    expect(isClosed(small)).toBe(true)

    const large = buildBody({ ...defaultTextureRollerParams, length: 150, diameter: 40 })
    const largeDims = dimensions(large)
    expect(largeDims.length).toBeCloseTo(150, 0)
    expect(largeDims.height).toBeCloseTo(40, 0)
    expect(largeDims.width).toBeCloseTo(40, 0)
    expect(isClosed(large)).toBe(true)
  })
})
