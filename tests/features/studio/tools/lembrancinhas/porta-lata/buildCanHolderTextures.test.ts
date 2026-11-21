import { describe, it, expect } from 'vitest'
import {
  buildCanHolder,
  disposeCanHolderResult,
} from '@/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder'
import { findOuterWall } from '@/features/studio/tools/lembrancinhas/porta-lata/buildBody'
import { bodyProfile } from '@/features/studio/tools/lembrancinhas/porta-lata/shapes'
import {
  defaultCanHolderParams,
  getInnerDiameter,
  getOuterRadius,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'
import { realFont, seamGroups } from './canHolderTestUtils'

// Arquivo separado: os builds completos com textura são caros e, somados ao
// arquivo principal, estouravam o watchdog de RPC do Vitest (`onTaskUpdate`)
// sob carga.
describe('buildCanHolder com textura', () => {
  it('une o texto sobre os picos da textura sem perder casca', () => {
    const params = {
      ...defaultCanHolderParams,
      textureStyle: 'scales' as const,
      textureDepth: 1.2,
      textCenterY: 30,
    }
    const result = buildCanHolder(params, realFont())
    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(signedVolume(result.body)).toBeGreaterThan(0)
    expect(result.handle).not.toBeNull()

    const position = result.body.getAttribute('position')
    let maxRadius = 0
    for (let i = 0; i < position.count; i++) {
      maxRadius = Math.max(maxRadius, Math.hypot(position.getX(i), position.getZ(i)))
    }
    expect(maxRadius).toBeGreaterThan(getOuterRadius(params) + 1.2 * 0.9)

    disposeCanHolderResult(result)
  })

  it('solda as normais da emenda da textura depois do CSG', () => {
    const params = {
      ...defaultCanHolderParams,
      textureStyle: 'wood' as const,
      textureDepth: 1.2,
    }
    const result = buildCanHolder(params, realFont())
    const normal = result.body.getAttribute('normal')
    const wall = findOuterWall(bodyProfile(params), getInnerDiameter(params) / 2)
    const groups = seamGroups(result.body, params)

    let pairs = 0
    for (const indices of groups.values()) {
      if (indices.length < 2) continue
      const [a, b] = indices
      expect(normal.getX(a)).toBeCloseTo(normal.getX(b), 3)
      expect(normal.getY(a)).toBeCloseTo(normal.getY(b), 3)
      expect(normal.getZ(a)).toBeCloseTo(normal.getZ(b), 3)
      pairs += 1
    }
    const top = [...groups.keys()].filter(
      (key) => Math.abs(Number(key) - wall.max) < 1e-3,
    )
    expect(top.length).toBeGreaterThan(0)
    expect(pairs).toBeGreaterThan(50)
    disposeCanHolderResult(result)
  })

  it('solda a emenda no extremo superior da parede', () => {
    const params = {
      ...defaultCanHolderParams,
      textureStyle: 'wood' as const,
      textureDepth: 1.2,
      bottomThickness: 3.3,
      edgeRimWidth: 4,
    }
    const result = buildCanHolder(params, realFont())
    const normal = result.body.getAttribute('normal')
    const wall = findOuterWall(bodyProfile(params), getInnerDiameter(params) / 2)
    const groups = seamGroups(result.body, params)
    const topKey = [...groups.keys()].find(
      (key) => Math.abs(Number(key) - wall.max) < 1e-3,
    )

    expect(topKey).toBeDefined()
    const indices = groups.get(topKey!)!
    expect(indices.length).toBeGreaterThanOrEqual(2)
    const [a, b] = indices
    expect(normal.getX(a)).toBeCloseTo(normal.getX(b), 3)
    expect(normal.getY(a)).toBeCloseTo(normal.getY(b), 3)
    expect(normal.getZ(a)).toBeCloseTo(normal.getZ(b), 3)
    disposeCanHolderResult(result)
  })
})
