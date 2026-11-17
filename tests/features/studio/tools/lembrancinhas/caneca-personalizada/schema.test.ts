import { describe, it, expect } from 'vitest'
import {
  defaultMugParams,
  getCapacityMl,
  mugGeometryParamsSchema,
  mugParamsSchema,
  sanitizeFilename,
  CONTENT_DEPTH,
  HANDLE_RING_THICKNESS,
  MAX_TEXT_LENGTH,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'

describe('caneca schema', () => {
  it('defaults válidos', () => {
    expect(mugParamsSchema.safeParse(defaultMugParams).success).toBe(true)
    expect(defaultMugParams).toMatchObject({
      productType: 'caneca-personalizada',
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
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, diameterTop: 69 }).success).toBe(false)
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, height: 116 }).success).toBe(false)
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, wallThickness: 1.7 }).success).toBe(false)
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, text: 'x'.repeat(21) }).success).toBe(false)
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, text: 'x'.repeat(MAX_TEXT_LENGTH) }).success).toBe(true)
  })

  it('rejeita cor fora da paleta', () => {
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, bodyColor: '#000000' }).success).toBe(false)
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, accentColor: '#000000' }).success).toBe(false)
  })

  it('schema de geometria descarta as cores', () => {
    const parsed = mugGeometryParamsSchema.safeParse(defaultMugParams)
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data).not.toHaveProperty('bodyColor')
    expect(parsed.success && parsed.data).not.toHaveProperty('accentColor')
    expect(
      mugGeometryParamsSchema.safeParse({ ...defaultMugParams, height: 79 }).success,
    ).toBe(false)
  })

  it('capacidade do default é 338 ml', () => {
    expect(getCapacityMl(defaultMugParams)).toBeCloseTo(338, 0)
  })

  it('capacidade do corpo cônico usa tronco de cone, não cilindro', () => {
    const conical = {
      ...defaultMugParams,
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
    expect(sanitizeFilename('Caneca da Ana! @#')).toBe('Caneca-da-Ana')
    expect(sanitizeFilename('')).toBe('caneca')
  })

  it('constantes', () => {
    expect(CONTENT_DEPTH).toBe(1)
    expect(HANDLE_RING_THICKNESS).toBe(3.5)
    expect(MAX_TEXT_LENGTH).toBe(20)
  })
})
