import { describe, it, expect } from 'vitest'
import {
  buildSupport,
  buildSupportProfile,
  getSupportDimensions,
} from '@/features/studio/tools/lembrancinhas/termoformador/buildSupport'
import {
  MINIMUM_SUPPORT_MM,
  defaultThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('getSupportDimensions', () => {
  it('deriva o rebaixo, a altura e a bacia a partir da tela', () => {
    const dims = getSupportDimensions(defaultThermoformerParams)

    expect(dims.recessRadius).toBeCloseTo(80.3, 5)
    expect(dims.outerRadius).toBeCloseTo(84.3, 5)
    expect(dims.height).toBeCloseTo(27, 5)
    expect(dims.seatY).toBeCloseTo(24, 5)
    expect(dims.cavityTopRadius).toBeCloseTo(75.3, 5)
    expect(dims.ledgeOverlap).toBeCloseTo(4.7, 5)
    expect(dims.sphereRadius).toBeCloseTo(151.75, 2)
    expect(dims.effectiveBowlDepth).toBeCloseTo(20, 5)
    expect(dims.cavityWall).toBeCloseTo(9, 5)
    expect(dims.bowlDepthLimited).toBe(false)
  })

  it('mantém folga radial entre a tela e o rebaixo', () => {
    const dims = getSupportDimensions(defaultThermoformerParams)
    expect(dims.recessRadius - defaultThermoformerParams.diameter / 2)
      .toBeCloseTo(defaultThermoformerParams.fitClearance, 5)
  })
})

describe('buildSupportProfile', () => {
  it('começa no eixo, passa pelo aro e termina no fundo da cavidade', () => {
    const profile = buildSupportProfile(defaultThermoformerParams)

    expect(profile[0].x).toBeCloseTo(0, 5)
    expect(profile[0].y).toBeCloseTo(0, 5)
    expect(profile[profile.length - 1].x).toBeCloseTo(0, 5)
    expect(profile[profile.length - 1].y).toBeCloseTo(4, 5)

    const hasPoint = (x: number, y: number) =>
      profile.some((point) => Math.abs(point.x - x) < 1e-6 && Math.abs(point.y - y) < 1e-6)

    // Chanfro de 0,6 mm nas duas arestas externas.
    expect(hasPoint(84.3, 26.4)).toBe(true)
    expect(hasPoint(83.7, 27)).toBe(true)
    expect(hasPoint(80.3, 27)).toBe(true)
    expect(hasPoint(80.3, 24)).toBe(true)
    expect(hasPoint(75.3, 24)).toBe(true)
    expect(hasPoint(83.7, 0)).toBe(true)
    expect(hasPoint(84.3, 0.6)).toBe(true)
  })

  it('sem chanfro usa as arestas externas retas', () => {
    const profile = buildSupportProfile({ ...defaultThermoformerParams, edgeChamfer: 0 })
    const hasPoint = (x: number, y: number) =>
      profile.some((point) => Math.abs(point.x - x) < 1e-6 && Math.abs(point.y - y) < 1e-6)
    expect(hasPoint(84.3, 0)).toBe(true)
    expect(hasPoint(84.3, 27)).toBe(true)
  })

  it('desenha a calota sobre a esfera e mantém a parede mínima', () => {
    const params = {
      ...defaultThermoformerParams,
      diameter: 60,
      wallThickness: 2,
      bowlDepth: 60,
      stepWidth: 2,
      fitClearance: 0.1,
    }
    const dims = getSupportDimensions(params)
    const profile = buildSupportProfile(params)

    const ledgeIndex = profile.findIndex(
      (point) => Math.abs(point.x - dims.cavityTopRadius) < 1e-6
        && Math.abs(point.y - dims.seatY) < 1e-6,
    )
    expect(ledgeIndex).toBeGreaterThan(0)

    const cavity = profile.slice(ledgeIndex + 1)
    expect(cavity.length).toBeGreaterThan(10)

    for (const point of cavity) {
      expect(point.x ** 2 + (point.y - dims.sphereCenterY) ** 2)
        .toBeCloseTo(dims.sphereRadius ** 2, 1)
    }

    const maxCavityRadius = Math.max(...cavity.map((point) => point.x))
    expect(maxCavityRadius)
      .toBeLessThanOrEqual(dims.outerRadius - MINIMUM_SUPPORT_MM + 1e-3)
  })
})

describe('buildSupport', () => {
  it('ocupa as dimensões externas e fica apoiado na mesa', () => {
    const geometry = buildSupport(defaultThermoformerParams)
    const dims = getSupportDimensions(defaultThermoformerParams)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.x).toBeCloseTo(-dims.outerRadius, 1)
    expect(box.max.x).toBeCloseTo(dims.outerRadius, 1)
    expect(box.min.z).toBeCloseTo(-dims.outerRadius, 1)
    expect(box.max.z).toBeCloseTo(dims.outerRadius, 1)
    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(dims.height, 3)
    geometry.dispose()
  })

  it('spike: malha fechada e volume positivo', () => {
    const geometry = buildSupport(defaultThermoformerParams)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('mantém a parede entre a bacia e o exterior', () => {
    const geometry = buildSupport(defaultThermoformerParams)
    const dims = getSupportDimensions(defaultThermoformerParams)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.x).toBeCloseTo(dims.outerRadius, 1)
    expect(dims.cavityWall).toBeGreaterThanOrEqual(0.8 - 1e-6)
    geometry.dispose()
  })

  it('limita a profundidade à semi-esfera para o macho poder ser retirado', () => {
    const params = {
      ...defaultThermoformerParams,
      diameter: 60,
      wallThickness: 2,
      bowlDepth: 60,
      stepWidth: 2,
      fitClearance: 0.1,
    }
    const dims = getSupportDimensions(params)

    expect(dims.bowlDepthLimited).toBe(true)
    expect(dims.effectiveBowlDepth).toBeCloseTo(dims.cavityTopRadius, 5)
    expect(dims.effectiveBowlDepth).toBeLessThan(60)
    expect(dims.cavityWall).toBeCloseTo(4, 5)

    const geometry = buildSupport(params)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.x).toBeCloseTo(dims.outerRadius, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('não deixa a bacia passar da abertura', () => {
    const dims = getSupportDimensions({
      ...defaultThermoformerParams,
      diameter: 60,
      stepWidth: 15,
      fitClearance: 0.6,
      bowlDepth: 60,
    })

    expect(dims.effectiveBowlDepth).toBeCloseTo(15.6, 5)
    expect(dims.effectiveBowlDepth).toBeLessThanOrEqual(dims.cavityTopRadius + 1e-9)
    expect(dims.seatY).toBeCloseTo(15.6 + defaultThermoformerParams.bottomThickness, 5)
  })
})
