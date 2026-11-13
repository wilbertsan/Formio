import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import {
  buildHandle,
  buildHandleProfile,
  handlePlacement,
} from '@/features/studio/tools/lembrancinhas/caixa-personalizada/buildHandle'
import { defaultBoxParams } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildHandle', () => {
  it('perfil começa e termina no eixo', () => {
    const profile = buildHandleProfile(defaultBoxParams)
    expect(profile[0].x).toBe(0)
    expect(profile[profile.length - 1].x).toBe(0)
    expect(profile[profile.length - 1].y).toBeCloseTo(defaultBoxParams.handleLength, 5)
  })

  it('pino à direita cresce em +X a partir da face', () => {
    const params = defaultBoxParams
    const geometry = buildHandle(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.min.x).toBeCloseTo(params.width / 2, 1)
    expect(box.max.x).toBeCloseTo(params.width / 2 + params.handleLength, 1)
  })

  it('pino no topo cresce em +Y a partir da borda', () => {
    const params = { ...defaultBoxParams, handleSide: 'top' as const }
    const geometry = buildHandle(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const bodyTop = params.height + params.rimHeight
    expect(box.min.y).toBeCloseTo(bodyTop, 1)
    expect(box.max.y).toBeCloseTo(bodyTop + params.handleLength, 1)
  })

  it('posiciona o eixo para cada lateral', () => {
    const params = defaultBoxParams
    const right = new Vector3(0, 1, 0).applyMatrix4(handlePlacement(params))
    const left = new Vector3(0, 1, 0).applyMatrix4(handlePlacement({ ...params, handleSide: 'left' }))
    const top = new Vector3(0, 1, 0).applyMatrix4(handlePlacement({ ...params, handleSide: 'top' }))
    const bottom = new Vector3(0, 1, 0).applyMatrix4(handlePlacement({ ...params, handleSide: 'bottom' }))
    expect(right.x).toBeGreaterThan(params.width / 2)
    expect(left.x).toBeLessThan(-params.width / 2)
    expect(top.y).toBeGreaterThan(params.height)
    expect(bottom.y).toBeLessThan(0)
  })

  it('pino padrão é fechado e tem volume positivo', () => {
    const geometry = buildHandle(defaultBoxParams)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('fecha para todas as laterais', () => {
    for (const handleSide of ['left', 'right', 'top', 'bottom'] as const) {
      const geometry = buildHandle({ ...defaultBoxParams, handleSide })
      expect(isClosed(geometry)).toBe(true)
      expect(signedVolume(geometry)).toBeGreaterThan(0)
    }
  })

  it('limita o raio da ponta ao raio do eixo', () => {
    const params = {
      ...defaultBoxParams,
      handleDiameter: 3,
      handleTipRadius: 5,
    }
    for (const point of buildHandleProfile(params)) {
      expect(point.x).toBeGreaterThanOrEqual(-1e-9)
    }
    const geometry = buildHandle(params)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('centraliza o pino no topo dentro da largura do corpo', () => {
    const params = defaultBoxParams
    const halfWidth = params.width / 2
    const boxes = [0, 0.5, 1].map((handleHeight) => {
      const geometry = buildHandle({ ...params, handleSide: 'top', handleHeight })
      geometry.computeBoundingBox()
      return geometry.boundingBox!
    })

    for (const box of boxes) {
      expect(box.min.x).toBeGreaterThanOrEqual(-halfWidth - 1e-6)
      expect(box.max.x).toBeLessThanOrEqual(halfWidth + 1e-6)
    }
    expect(boxes[0].min.x).toBeCloseTo(-halfWidth, 1)
    expect(boxes[2].max.x).toBeCloseTo(halfWidth, 1)
  })

  it('centraliza o pino embaixo dentro da largura do corpo', () => {
    const params = defaultBoxParams
    const halfWidth = params.width / 2
    const boxes = [0, 0.5, 1].map((handleHeight) => {
      const geometry = buildHandle({ ...params, handleSide: 'bottom', handleHeight })
      geometry.computeBoundingBox()
      return geometry.boundingBox!
    })

    for (const box of boxes) {
      expect(box.min.x).toBeGreaterThanOrEqual(-halfWidth - 1e-6)
      expect(box.max.x).toBeLessThanOrEqual(halfWidth + 1e-6)
      expect(box.max.y).toBeCloseTo(0, 1)
    }
    expect(boxes[0].min.x).toBeCloseTo(-halfWidth, 1)
    expect(boxes[2].max.x).toBeCloseTo(halfWidth, 1)
  })

  it('mantém o pino lateral dentro da altura do corpo', () => {
    const params = defaultBoxParams
    const bodyTop = params.height + params.rimHeight

    for (const handleSide of ['left', 'right'] as const) {
      for (const handleHeight of [0, 0.5, 1]) {
        const geometry = buildHandle({ ...params, handleSide, handleHeight })
        geometry.computeBoundingBox()
        const box = geometry.boundingBox!
        expect(box.min.y).toBeGreaterThanOrEqual(-1e-6)
        expect(box.max.y).toBeLessThanOrEqual(bodyTop + 1e-6)
      }
    }
  })
})
