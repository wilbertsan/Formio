import { describe, it, expect } from 'vitest'
import {
  CAN_DIAMETER,
  CAN_HEIGHT,
  CAN_VOLUME_ML,
  CONTENT_DEPTH,
  HANDLE_RING_THICKNESS,
  MAX_TEXT_LENGTH,
  canHolderGeometryParamsSchema,
  canHolderParamsSchema,
  defaultCanHolderParams,
  getEffectiveLeadIn,
  getEffectiveRimChamfer,
  getExposedHeight,
  getInnerDiameter,
  getOuterDiameter,
  getOuterHeight,
  getTopLand,
  sanitizeFilename,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'

describe('porta-lata schema', () => {
  it('defaults válidos', () => {
    expect(canHolderParamsSchema.safeParse(defaultCanHolderParams).success).toBe(true)
    expect(defaultCanHolderParams).toMatchObject({
      productType: 'porta-lata',
      cavityDepth: 108,
      canClearance: 0.8,
      wallThickness: 2.4,
      bottomThickness: 3.2,
      ventHoleDiameter: 10,
      rimLeadIn: 1.0,
      rimChamfer: 0.4,
      handleEnabled: true,
      handleHeight: 60,
      handleGap: 30,
      handleReach: 40,
      handleBand: 6.5,
      handleWidth: 12,
      handleClearance: 0.3,
      text: 'Festa',
      textSize: 10,
      fontStyle: 'normal',
      textCenterY: 60,
    })
  })

  it('mantém exatamente os campos do schema', () => {
    expect(Object.keys(defaultCanHolderParams).sort()).toEqual(
      Object.keys(canHolderParamsSchema.shape).sort(),
    )
  })

  it('rejeita dimensões e folgas fora da faixa', () => {
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, cavityDepth: 79 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, cavityDepth: 119 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, canClearance: 0.4 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, canClearance: 1.3 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, wallThickness: 1.7 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, wallThickness: 4.1 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, bottomThickness: 1.9 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, bottomThickness: 6.1 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, ventHoleDiameter: 5 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, ventHoleDiameter: 15 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, rimLeadIn: 0.4 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, rimLeadIn: 2.1 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, rimChamfer: -0.1 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, rimChamfer: 1.6 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, text: 'x'.repeat(21) }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, text: 'x'.repeat(MAX_TEXT_LENGTH) }).success).toBe(true)
  })

  it('aceita os limites da faixa', () => {
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, cavityDepth: 80 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, cavityDepth: 118 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, canClearance: 0.5 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, canClearance: 1.2 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, ventHoleDiameter: 6 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, ventHoleDiameter: 14 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, rimLeadIn: 0.5 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, rimLeadIn: 2 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, rimChamfer: 0 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, rimChamfer: 1.5 }).success).toBe(true)
  })

  it('limita o texto por code points', () => {
    expect(
      canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, text: '🎉'.repeat(MAX_TEXT_LENGTH) }).success,
    ).toBe(true)
    expect(
      canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, text: '🎉'.repeat(MAX_TEXT_LENGTH + 1) }).success,
    ).toBe(false)
  })

  it('rejeita cor fora da paleta', () => {
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, bodyColor: '#000000' }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, accentColor: '#000000' }).success).toBe(false)
  })

  it('schema de geometria descarta as cores', () => {
    const parsed = canHolderGeometryParamsSchema.safeParse(defaultCanHolderParams)
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data).not.toHaveProperty('bodyColor')
    expect(parsed.success && parsed.data).not.toHaveProperty('accentColor')
    expect(
      canHolderGeometryParamsSchema.safeParse({ ...defaultCanHolderParams, cavityDepth: 79 }).success,
    ).toBe(false)
  })

  it('sanitizeFilename', () => {
    expect(sanitizeFilename('Porta-lata da Ana! @#')).toBe('Porta-lata-da-Ana')
    expect(sanitizeFilename('')).toBe('porta-lata')
  })

  it('constantes', () => {
    expect(CONTENT_DEPTH).toBe(1)
    expect(HANDLE_RING_THICKNESS).toBe(3.5)
    expect(MAX_TEXT_LENGTH).toBe(20)
  })
})

describe('preset da lata e derivados', () => {
  it('preset da Coca-Cola 350 ml', () => {
    expect(CAN_DIAMETER).toBe(66.2)
    expect(CAN_HEIGHT).toBe(122.2)
    expect(CAN_VOLUME_ML).toBe(350)
  })

  it('calcula as dimensões derivadas no default', () => {
    expect(getInnerDiameter(defaultCanHolderParams)).toBeCloseTo(67.8, 5)
    expect(getOuterDiameter(defaultCanHolderParams)).toBeCloseTo(72.6, 5)
    expect(getOuterHeight(defaultCanHolderParams)).toBeCloseTo(111.2, 5)
    expect(getExposedHeight(defaultCanHolderParams)).toBeCloseTo(14.2, 5)
    expect(getTopLand(defaultCanHolderParams)).toBeCloseTo(1.0, 5)
  })

  it('limita a borda de entrada para preservar a parede do topo', () => {
    const params = {
      ...defaultCanHolderParams,
      wallThickness: 1.8,
      rimLeadIn: 2,
    }
    expect(getEffectiveLeadIn(params)).toBeCloseTo(1.0, 5)
    expect(getTopLand(params)).toBeCloseTo(0.8, 5)
  })

  it('limita o chanfro externo quando a parede não comporta', () => {
    const params = {
      ...defaultCanHolderParams,
      wallThickness: 1.8,
      rimLeadIn: 1.0,
      rimChamfer: 1.5,
    }
    expect(getEffectiveRimChamfer(params)).toBeCloseTo(0, 5)

    const partial = {
      ...defaultCanHolderParams,
      rimLeadIn: 1.0,
      rimChamfer: 1.5,
    }
    expect(getEffectiveRimChamfer(partial)).toBeCloseTo(0.6, 5)
  })
})
