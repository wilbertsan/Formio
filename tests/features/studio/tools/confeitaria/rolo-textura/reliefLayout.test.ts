import { describe, it, expect } from 'vitest'
import {
  buildPatternPaths, computeReliefLayout, fitMotif, motifSpan, scaleMotif,
} from '@/features/studio/tools/confeitaria/rolo-textura/reliefLayout'
import type { MotifShape } from '@/features/studio/tools/confeitaria/rolo-textura/patterns'
import { defaultTextureRollerParams, MIN_FEATURE_MM } from '@/features/studio/tools/confeitaria/rolo-textura/schema'
import { pathsBoundingBox } from '@/features/studio/tools/confeitaria/shared/textOutline'

const square: MotifShape = {
  outer: [
    { x: -0.4, y: -0.4 },
    { x: 0.4, y: -0.4 },
    { x: 0.4, y: 0.4 },
    { x: -0.4, y: 0.4 },
  ],
  holes: [],
}

describe('reliefLayout', () => {
  it('calcula a grade com escala uniforme por min(cellW, cellH)', () => {
    const layout = computeReliefLayout(defaultTextureRollerParams)
    expect(layout.cellCols).toBe(12)
    expect(layout.cellRows).toBe(13)
    expect(layout.cellW).toBeCloseTo(7.854, 3)
    expect(layout.cellH).toBeCloseTo(7.692, 3)
    expect(layout.cellSpan).toBeCloseTo(7.692, 3)
  })

  it('não dilata motivo já espesso', () => {
    const fit = fitMotif(1, 0.4, 5)
    expect(fit.scale).toBe(5)
    expect(fit.dilation).toBe(0)
  })

  it('reduz e dilata motivo fino mantendo o tamanho externo', () => {
    const span = 1
    const minThickness = 0.1
    const baseScale = 5
    const fit = fitMotif(span, minThickness, baseScale)

    expect(fit.scale).toBeCloseTo(4.6667, 3)
    expect(fit.dilation).toBeCloseTo(0.1667, 3)
    expect(span * fit.scale + 2 * fit.dilation).toBeCloseTo(span * baseScale, 5)
    expect(minThickness * fit.scale + 2 * fit.dilation).toBeCloseTo(MIN_FEATURE_MM, 5)
  })

  it('trata motivo circular sem divisão por zero', () => {
    const fit = fitMotif(0.76, 0.76, 1)
    expect(fit.scale).toBeCloseTo(MIN_FEATURE_MM / 0.76, 5)
    expect(fit.dilation).toBe(0)
  })

  it('mede e escala o motivo uniformemente', () => {
    expect(motifSpan([square])).toBeCloseTo(0.8, 5)
    const scaled = scaleMotif([square], 2)
    expect(scaled[0].outer[0]).toEqual({ x: -0.8, y: -0.8 })
  })

  it('replica nas células, duplica na emenda e recorta', () => {
    const layout = computeReliefLayout(defaultTextureRollerParams)
    const paths = buildPatternPaths({
      params: defaultTextureRollerParams,
      layout,
      shapes: [square],
      dilation: 0,
      staggered: false,
    })
    expect(paths.length).toBeGreaterThan(0)

    const bounds = pathsBoundingBox(paths)
    const margin = 1
    const tolerance = 0.002
    expect(bounds.minX).toBeGreaterThanOrEqual(-defaultTextureRollerParams.length / 2 + margin - tolerance)
    expect(bounds.maxX).toBeLessThanOrEqual(defaultTextureRollerParams.length / 2 - margin + tolerance)
    expect(bounds.minY).toBeGreaterThanOrEqual(-tolerance)
    expect(bounds.maxY).toBeLessThanOrEqual(layout.circumference + tolerance)
  })
})
