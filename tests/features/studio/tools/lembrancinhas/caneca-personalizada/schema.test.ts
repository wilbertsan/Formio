import { describe, it, expect } from 'vitest'
import {
  defaultMugParams,
  getCapacityMl,
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
  })

  it('rejeita cor fora da paleta', () => {
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, bodyColor: '#000000' }).success).toBe(false)
  })

  it('capacidade do default fica entre 300 e 380 ml', () => {
    const capacity = getCapacityMl(defaultMugParams)
    expect(capacity).toBeGreaterThan(300)
    expect(capacity).toBeLessThan(380)
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
