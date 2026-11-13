import { describe, it, expect } from 'vitest'
import {
  defaultThermoformerParams,
  sanitizeFilename,
  thermoformerParamsSchema,
  MAX_PANEL_OPENINGS,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('termoformador schema', () => {
  it('defaults válidos', () => {
    expect(thermoformerParamsSchema.safeParse(defaultThermoformerParams).success).toBe(true)
    expect(defaultThermoformerParams).toMatchObject({
      productType: 'termoformador',
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
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, width: 59 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, height: 121 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, holeDiameter: 0.7 }).success).toBe(false)
  })

  it('rejeita enums inválidos', () => {
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, fitType: 'press' as never }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, pattern: 'dots' as never }).success).toBe(false)
  })

  it('sanitizeFilename', () => {
    expect(sanitizeFilename('Meu Termoformador! @#')).toBe('Meu-Termoformador')
    expect(sanitizeFilename('')).toBe('termoformador')
    expect(sanitizeFilename('Corpo 3D')).toBe('Corpo-3D')
  })

  it('limite de aberturas é 800', () => {
    expect(MAX_PANEL_OPENINGS).toBe(800)
  })
})
