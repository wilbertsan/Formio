import { describe, it, expect } from 'vitest'
import { getTrayDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/tray'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

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
    expect(dims.effectiveDepth).toBeLessThan(60)
  })

  it('usa o fundo da pirâmide', () => {
    const params = { ...defaultThermoformerParams, shape: 'pyramid' as const, width: 120 }
    const dims = getTrayDimensions(params, getShapeOutline(params)!)
    expect(dims.bottomScale).toBeCloseTo(0.1, 5)
    expect(dims.effectiveDepth).toBeCloseTo(20, 5)
  })
})
