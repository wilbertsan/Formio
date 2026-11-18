import { describe, it, expect } from 'vitest'
import {
  defaultCanHolderParams,
  getCapacityMl,
  canHolderGeometryParamsSchema,
  canHolderParamsSchema,
  sanitizeFilename,
  CONTENT_DEPTH,
  HANDLE_RING_THICKNESS,
  MAX_TEXT_LENGTH,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'

describe('porta-lata schema', () => {
  it('defaults válidos', () => {
    expect(canHolderParamsSchema.safeParse(defaultCanHolderParams).success).toBe(true)
    expect(defaultCanHolderParams).toMatchObject({
      productType: 'porta-lata',
      diameterTop: 80,
      diameterBottom: 72,
      height: 88,
      wallThickness: 2.4,
      bottomThickness: 3.2,
      handleEnabled: true,
      handleHeight: 52,
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

  it('rejeita dimensões fora da faixa', () => {
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, diameterTop: 69 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, height: 116 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, wallThickness: 1.7 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, text: 'x'.repeat(21) }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, text: 'x'.repeat(MAX_TEXT_LENGTH) }).success).toBe(true)
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
      canHolderGeometryParamsSchema.safeParse({ ...defaultCanHolderParams, height: 79 }).success,
    ).toBe(false)
  })

  it('capacidade do default é 338 ml', () => {
    expect(getCapacityMl(defaultCanHolderParams)).toBeCloseTo(338, 0)
  })

  it('capacidade do corpo cônico usa tronco de cone, não cilindro', () => {
    const conical = {
      ...defaultCanHolderParams,
      diameterTop: 100,
      diameterBottom: 60,
      height: 115,
      wallThickness: 2,
      bottomThickness: 3,
    }
    // (π/3) · (115 - 3) · (28² + 28·48 + 48²) mm³ → ml, com raios internos 28 e 48
    expect(getCapacityMl(conical)).toBeCloseTo(519.81, 2)
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
