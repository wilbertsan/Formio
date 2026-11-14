import { describe, it, expect } from 'vitest'
import {
  defaultThermoformerParams,
  sanitizeFilename,
  thermoformerParamsSchema,
  MAX_SCREEN_OPENINGS,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('termoformador schema', () => {
  it('defaults válidos', () => {
    expect(thermoformerParamsSchema.safeParse(defaultThermoformerParams).success).toBe(true)
    expect(defaultThermoformerParams).toMatchObject({
      productType: 'termoformador',
      diameter: 160,
      thickness: 3,
      frameWidth: 6,
      lineWidth: 2,
      opening: 6,
    })
  })

  it('rejeita dimensões fora da faixa', () => {
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, diameter: 59 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, thickness: 7 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, lineWidth: 0.5 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, opening: 2 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, frameWidth: 1 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, frameWidth: 31 }).success).toBe(false)
  })

  it('rejeita productType diferente de termoformador', () => {
    expect(
      thermoformerParamsSchema.safeParse({
        ...defaultThermoformerParams,
        productType: 'caixa-personalizada' as never,
      }).success,
    ).toBe(false)
  })

  it('rejeita cor fora da paleta', () => {
    expect(
      thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, color: '#000000' }).success,
    ).toBe(false)
  })

  it('sanitizeFilename', () => {
    expect(sanitizeFilename('Minha Tela! @#')).toBe('Minha-Tela')
    expect(sanitizeFilename('')).toBe('termoformador')
    expect(sanitizeFilename('Tela 3D')).toBe('Tela-3D')
  })

  it('limite de favos é 4000', () => {
    expect(MAX_SCREEN_OPENINGS).toBe(4000)
  })
})
