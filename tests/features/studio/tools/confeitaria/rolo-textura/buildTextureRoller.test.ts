import { describe, it, expect } from 'vitest'
import type { BufferGeometry } from 'three'
import { bodyRowForX, buildTextureRoller } from '@/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller'
import { defaultTextureRollerParams } from '@/features/studio/tools/confeitaria/rolo-textura/schema'

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
  it('mapeia a posição axial para linhas do campo de forma monotônica', () => {
    const length = 100
    const bodyRows = 208
    expect(bodyRowForX(-50, length, bodyRows)).toBe(0)
    expect(bodyRowForX(50, length, bodyRows)).toBe(bodyRows - 1)
    let previous = -1
    for (let x = -50; x <= 50; x += 0.5) {
      const row = bodyRowForX(x, length, bodyRows)
      expect(row).toBeGreaterThanOrEqual(previous)
      previous = row
    }
  })

  it('gera malha indexada com vértices e dois grupos de material', () => {
    const { roller } = buildTextureRoller({ params: defaultTextureRollerParams })
    expect(roller.getAttribute('position').count).toBeGreaterThan(1000)
    expect(roller.getIndex()).not.toBeNull()
    expect(roller.groups).toHaveLength(2)
    expect(roller.groups[1].count).toBeGreaterThan(0)
  })

  it('dimensões: comprimento total igual ao length; raio máximo = D/2 + profundidade', () => {
    const { roller } = buildTextureRoller({ params: defaultTextureRollerParams })
    roller.computeBoundingBox()
    const bb = roller.boundingBox!
    expect(bb.max.x - bb.min.x).toBeCloseTo(defaultTextureRollerParams.length, 0)
    expect(maxRadius(roller)).toBeCloseTo(defaultTextureRollerParams.diameter / 2 + defaultTextureRollerParams.reliefDepth, 1)
  })

  it('não tem cabos laterais: largura igual ao comprimento', () => {
    const { roller } = buildTextureRoller({ params: defaultTextureRollerParams })
    roller.computeBoundingBox()
    const bb = roller.boundingBox!
    expect(bb.max.x).toBeCloseTo(defaultTextureRollerParams.length / 2, 1)
    expect(bb.min.x).toBeCloseTo(-defaultTextureRollerParams.length / 2, 1)
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
    expect(small.boundingBox!.max.x - small.boundingBox!.min.x).toBeCloseTo(50, 0)
    const large = buildTextureRoller({ params: { ...defaultTextureRollerParams, length: 150, diameter: 40 } }).roller
    large.computeBoundingBox()
    expect(large.boundingBox!.max.x - large.boundingBox!.min.x).toBeCloseTo(150, 0)
  })

  it('respeita diâmetro mínimo e máximo', () => {
    const small = buildTextureRoller({ params: { ...defaultTextureRollerParams, length: 50, diameter: 20 } }).roller
    expect(maxRadius(small)).toBeCloseTo(10 + defaultTextureRollerParams.reliefDepth, 1)
    const large = buildTextureRoller({ params: { ...defaultTextureRollerParams, length: 150, diameter: 40 } }).roller
    expect(maxRadius(large)).toBeCloseTo(20 + defaultTextureRollerParams.reliefDepth, 1)
    expect(isClosed(large)).toBe(true)
  })

  it('gera malha válida sem relevo (SVG ausente)', () => {
    const { roller } = buildTextureRoller({
      params: { ...defaultTextureRollerParams, patternSource: 'svg', svgIcon: '<svg/>' },
      parsedSvg: null,
    })
    expect(isClosed(roller)).toBe(true)
    expect(roller.groups[1].count).toBe(0)
  })
})
