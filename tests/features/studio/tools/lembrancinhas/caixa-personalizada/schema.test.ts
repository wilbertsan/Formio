import { describe, it, expect } from 'vitest'
import {
  defaultBoxParams,
  sanitizeFilename,
  boxParamsSchema,
  MAX_PANEL_OPENINGS,
} from '@/features/studio/tools/lembrancinhas/caixa-personalizada/schema'

describe('caixa-personalizada schema', () => {
  it('defaults válidos', () => {
    expect(boxParamsSchema.safeParse(defaultBoxParams).success).toBe(true)
    expect(defaultBoxParams).toMatchObject({
      productType: 'caixa-personalizada',
      width: 160,
      depth: 120,
      height: 60,
      frontPanelHeight: 50,
      lidEnabled: true,
      handleEnabled: true,
      baseEnabled: true,
      fitType: 'external',
      pattern: 'perforated',
    })
  })

  it('rejeita dimensões fora da faixa', () => {
    expect(boxParamsSchema.safeParse({ ...defaultBoxParams, width: 59 }).success).toBe(false)
    expect(boxParamsSchema.safeParse({ ...defaultBoxParams, height: 121 }).success).toBe(false)
    expect(boxParamsSchema.safeParse({ ...defaultBoxParams, holeDiameter: 0.7 }).success).toBe(false)
  })

  it('rejeita enums inválidos', () => {
    expect(boxParamsSchema.safeParse({ ...defaultBoxParams, fitType: 'press' as never }).success).toBe(false)
    expect(boxParamsSchema.safeParse({ ...defaultBoxParams, pattern: 'dots' as never }).success).toBe(false)
  })

  it('sanitizeFilename', () => {
    expect(sanitizeFilename('Meu Caixa Personalizada! @#')).toBe('Meu-Caixa-Personalizada')
    expect(sanitizeFilename('')).toBe('caixa-personalizada')
    expect(sanitizeFilename('Corpo 3D')).toBe('Corpo-3D')
  })

  it('limite de aberturas é 800', () => {
    expect(MAX_PANEL_OPENINGS).toBe(800)
  })
})
