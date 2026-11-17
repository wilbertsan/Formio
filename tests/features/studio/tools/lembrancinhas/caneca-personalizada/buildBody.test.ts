import { describe, it, expect } from 'vitest'
import { buildBody } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildBody'
import { bodyProfile, getInnerRadius } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/shapes'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildBody', () => {
  it('gera corpo fechado com volume positivo e altura correta', () => {
    const geometry = buildBody(defaultMugParams)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(defaultMugParams.height, 3)
    expect(box.max.x).toBeCloseTo(defaultMugParams.diameterTop / 2, 2)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('a cavidade interna respeita a parede', () => {
    expect(getInnerRadius(defaultMugParams, 0)).toBeCloseTo(36 - 2.4, 5)
    expect(getInnerRadius(defaultMugParams, defaultMugParams.height)).toBeCloseTo(40 - 2.4, 5)
  })

  it('o perfil é fechado e começa/termina no eixo', () => {
    const points = bodyProfile(defaultMugParams)
    expect(points[0].x).toBeCloseTo(0, 6)
    expect(points[points.length - 1].x).toBeCloseTo(0, 6)
  })

  it('o chanfro da borda não fura a parede', () => {
    const geometry = buildBody({ ...defaultMugParams, rimChamfer: 2 })
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })
})
