import { describe, it, expect } from 'vitest'
import {
  textureRollerParamsSchema, defaultTextureRollerParams, sanitizeFilename,
  DENSITY_CELL_MM, defaultMotifForFamily,
} from '@/features/studio/tools/confeitaria/rolo-textura/schema'

describe('rolo-textura schema', () => {
  it('defaults válidos', () => {
    expect(textureRollerParamsSchema.safeParse(defaultTextureRollerParams).success).toBe(true)
    expect(defaultTextureRollerParams).toMatchObject({
      productType: 'texture-roller', length: 100, diameter: 30,
      patternFamily: 'geometric', patternMotif: 'diamonds',
      patternSource: 'motif', svgLineWidth: 0.8, reliefDepth: 1, density: 'medium',
    })
  })
  it('rejeita motivo fora da família', () => {
    const bad = { ...defaultTextureRollerParams, patternFamily: 'floral' as const, patternMotif: 'dots' }
    expect(textureRollerParamsSchema.safeParse(bad).success).toBe(false)
  })
  it('exige svg quando patternSource=svg', () => {
    const bad = { ...defaultTextureRollerParams, patternSource: 'svg' as const, svgIcon: null }
    expect(textureRollerParamsSchema.safeParse(bad).success).toBe(false)
  })
  it('limita dimensões e profundidade', () => {
    expect(textureRollerParamsSchema.safeParse({ ...defaultTextureRollerParams, length: 49 }).success).toBe(false)
    expect(textureRollerParamsSchema.safeParse({ ...defaultTextureRollerParams, diameter: 41 }).success).toBe(false)
    expect(textureRollerParamsSchema.safeParse({ ...defaultTextureRollerParams, reliefDepth: 2.1 }).success).toBe(false)
    expect(textureRollerParamsSchema.safeParse({ ...defaultTextureRollerParams, svgLineWidth: 0.2 }).success).toBe(false)
    expect(textureRollerParamsSchema.safeParse({ ...defaultTextureRollerParams, svgLineWidth: 2.1 }).success).toBe(false)
  })
  it('sanitizeFilename', () => {
    expect(sanitizeFilename('Rolo de Textura!')).toBe('Rolo_de_Textura_')
    expect(sanitizeFilename('')).toBe('rolo-textura')
  })
  it('defaultMotifForFamily e densidades', () => {
    expect(defaultMotifForFamily('floral')).toBe('flower')
    expect(DENSITY_CELL_MM.high).toBe(5)
  })
})
