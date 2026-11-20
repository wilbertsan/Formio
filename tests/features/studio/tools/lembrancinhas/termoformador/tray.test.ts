import { describe, it, expect } from 'vitest'
import { getTrayDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/tray'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { pathsBoundingBox } from '@/features/studio/tools/confeitaria/shared/textOutline'

describe('getTrayDimensions', () => {
  it('deriva bandeja quadrada com degrau efetivo', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expect(dims.effectiveStep).toBeCloseTo(6.3, 5)
    expect(dims.stepClamped).toBe(true)
    expect(dims.seatY).toBeCloseTo(24, 5)
    expect(dims.height).toBeCloseTo(27, 5)
    expect(dims.bodyTop).toBeCloseTo(53, 5)
    expect(dims.plugTotalHeight).toBeCloseTo(46, 5)
  })

  it('limita a profundidade para o fundo não colapsar', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 40,
      bowlDepth: 60,
      draftAngle: 15,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expect(dims.depthLimited).toBe(true)
    expect(dims.bottomScale).toBeCloseTo(0.05, 5)
    expect(dims.effectiveDepth).toBeCloseTo(49.64, 2)
  })

  it('usa o fundo da pirâmide', () => {
    const params = { ...defaultThermoformerParams, shape: 'pyramid' as const, width: 120 }
    const dims = getTrayDimensions(params, getShapeOutline(params)!)
    expect(dims.bottomScale).toBeCloseTo(0.1, 5)
    expect(dims.effectiveDepth).toBeCloseTo(20, 5)
  })

  it('usa a abertura da cavidade e não a área perfurada', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 140,
      frameWidth: 3,
      stepWidth: 8,
      draftAngle: 5,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const cavity = pathsBoundingBox(outline.cavityOpening!)
    const minOpening = Math.min(cavity.width, cavity.height)
    expect(dims.stepClamped).toBe(false)
    expect((minOpening * (1 - dims.bottomScale)) / 2)
      .toBeCloseTo(dims.effectiveDepth * Math.tan((5 * Math.PI) / 180), 1)
  })

  it('mantém o fundo reto sem inclinação', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
      draftAngle: 0,
    }
    const dims = getTrayDimensions(params, getShapeOutline(params)!)
    expect(dims.bottomScale).toBe(1)
    expect(dims.draftLow).toBe(true)
  })

  it('avisa quando a ponta da pirâmide fica pequena', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'pyramid' as const,
      width: 40,
    }
    const dims = getTrayDimensions(params, getShapeOutline(params)!)
    expect(dims.tipSmall).toBe(true)
  })

  it('rejeita contorno circular', () => {
    const outline = getShapeOutline(defaultThermoformerParams)!
    expect(() => getTrayDimensions(defaultThermoformerParams, outline))
      .toThrow('getTrayDimensions só aceita contornos poligonais')
  })
})
