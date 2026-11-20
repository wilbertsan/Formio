import { describe, it, expect } from 'vitest'
import {
  buildPlug,
  buildPlugProfile,
  getPlugDimensions,
} from '@/features/studio/tools/lembrancinhas/termoformador/buildPlug'
import { getSupportDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/buildSupport'
import {
  PLUG_DOME_SEGMENTS,
  PLUG_GRIP_MIN_MATERIAL_MM,
  defaultThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('getPlugDimensions', () => {
  it('deriva o domo, a coroa e a pega da tela e do suporte', () => {
    const params = defaultThermoformerParams
    const support = getSupportDimensions(params)
    const dims = getPlugDimensions(params)

    expect(dims.guideRadius).toBeCloseTo(80, 5)
    expect(dims.contactRadius).toBeCloseTo(support.cavityTopRadius, 5)
    expect(dims.contactY).toBeCloseTo(support.height, 5)
    expect(dims.bodyTop).toBeCloseTo(support.height + params.plugHeight, 5)
    expect(dims.domeCenterY).toBeCloseTo(
      params.bottomThickness + params.thickness,
      5,
    )
    expect(dims.gripRadius).toBeCloseTo(23.4, 5)
    expect(dims.gripDepth).toBeCloseTo(28.08, 1)
    expect(dims.height).toBeCloseTo(
      support.effectiveBowlDepth + params.plugHeight,
      5,
    )
  })

  it('não deixa a pega furar o domo', () => {
    const dims = getPlugDimensions({
      ...defaultThermoformerParams,
      diameter: 60,
      plugHeight: 10,
      bowlDepth: 5,
    })

    expect(dims.bodyTop - dims.gripDepth).toBeGreaterThanOrEqual(
      dims.domeCenterY + PLUG_GRIP_MIN_MATERIAL_MM - 1e-9,
    )
    expect(dims.gripRadius).toBeLessThan(dims.contactRadius)
    expect(dims.guideRadius - dims.contactRadius).toBeGreaterThanOrEqual(1.4 - 1e-9)
  })

  it('mantém o domo dentro do raio-guia nos extremos', () => {
    const dims = getPlugDimensions({
      ...defaultThermoformerParams,
      diameter: 60,
      plugHeight: 40,
      stepWidth: 15,
      fitClearance: 0.6,
      bowlDepth: 60,
    })

    expect(dims.contactRadius).toBeLessThanOrEqual(dims.guideRadius + 1e-9)
    expect(dims.height).toBeCloseTo(dims.bodyTop - dims.domeCenterY, 5)
    expect(dims.guideRadius - dims.contactRadius).toBeGreaterThanOrEqual(1.4 - 1e-9)
  })
})

describe('buildPlugProfile', () => {
  it('começa no centro do domo, passa pela coroa e termina no ápice da pega', () => {
    const params = defaultThermoformerParams
    const dims = getPlugDimensions(params)
    const profile = buildPlugProfile(params)
    const hasPoint = (x: number, y: number) =>
      profile.some(
        (point) => Math.abs(point.x - x) < 1e-6 && Math.abs(point.y - y) < 1e-6,
      )

    expect(profile[0].x).toBeCloseTo(0, 5)
    expect(profile[0].y).toBeCloseTo(dims.domeCenterY, 5)
    expect(profile[profile.length - 1].x).toBeCloseTo(0, 5)
    expect(profile[profile.length - 1].y).toBeCloseTo(
      dims.bodyTop - dims.gripDepth,
      5,
    )
    expect(hasPoint(dims.guideRadius, dims.contactY)).toBe(true)
    expect(hasPoint(dims.guideRadius, dims.bodyTop - dims.chamfer)).toBe(true)
    expect(hasPoint(dims.gripRadius, dims.bodyTop)).toBe(true)
  })

  it('domo é a bacia deslocada pela espessura da tela', () => {
    const params = defaultThermoformerParams
    const support = getSupportDimensions(params)
    const profile = buildPlugProfile(params)
    const dome = profile.slice(0, PLUG_DOME_SEGMENTS + 1)

    for (const point of dome) {
      expect(point.y - params.thickness).toBeCloseTo(
        support.sphereCenterY
          - Math.sqrt(support.sphereRadius ** 2 - point.x ** 2),
        5,
      )
    }
  })
})

describe('buildPlug', () => {
  it('ocupa o diâmetro e a altura de impressão', () => {
    const params = defaultThermoformerParams
    const dims = getPlugDimensions(params)
    const geometry = buildPlug(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.x).toBeCloseTo(-dims.guideRadius, 1)
    expect(box.max.x).toBeCloseTo(dims.guideRadius, 1)
    expect(box.min.y).toBeCloseTo(dims.domeCenterY, 3)
    expect(box.max.y).toBeCloseTo(dims.bodyTop, 3)
    geometry.dispose()
  })

  it('gera malha fechada e volume positivo', () => {
    const geometry = buildPlug(defaultThermoformerParams)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('permanece fechado nos extremos', () => {
    const extremes = [
      {
        ...defaultThermoformerParams,
        diameter: 60,
        plugHeight: 40,
        stepWidth: 15,
        fitClearance: 0.6,
        bowlDepth: 60,
      },
      {
        ...defaultThermoformerParams,
        diameter: 300,
        plugHeight: 10,
        thickness: 6,
        wallThickness: 10,
        stepWidth: 2,
        fitClearance: 0.1,
        bowlDepth: 5,
      },
    ]

    for (const params of extremes) {
      const geometry = buildPlug(params)
      expect(isClosed(geometry)).toBe(true)
      expect(signedVolume(geometry)).toBeGreaterThan(0)
      geometry.dispose()
    }
  })
})
