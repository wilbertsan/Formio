import { describe, it, expect } from 'vitest'
import {
  cutterStampParamsSchema,
  defaultCutterStampParams,
  sanitizeFilename,
  PLA_COLORS,
} from '@/features/studio/tools/confeitaria/cortador-carimbo/schema'

describe('cutterStampParamsSchema', () => {
  it('validates default params', () => {
    expect(cutterStampParamsSchema.safeParse(defaultCutterStampParams).success).toBe(true)
  })

  // --- Texto ---

  it('exige texto não-vazio', () => {
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, text: '' }).success).toBe(false)
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, text: '   ' }).success).toBe(false)
  })

  it('rejeita texto com mais de 30 caracteres', () => {
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, text: 'a'.repeat(31) }).success).toBe(false)
  })

  it('rejeita fontStyle inválido', () => {
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, fontStyle: 'italic' }).success).toBe(false)
  })

  it('rejeita textHeight fora de 10–60mm', () => {
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, textHeight: 5 }).success).toBe(false)
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, textHeight: 80 }).success).toBe(false)
  })

  // --- Cortador ---

  it('rejeita wallHeight fora de 15–40mm', () => {
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, wallHeight: 10 }).success).toBe(false)
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, wallHeight: 45 }).success).toBe(false)
  })

  it('rejeita wallThickness fora de 0.8–2mm', () => {
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, wallThickness: 0.5 }).success).toBe(false)
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, wallThickness: 3 }).success).toBe(false)
  })

  // --- Carimbo ---

  it('rejeita stampHeight fora de 15–25mm', () => {
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, stampHeight: 10 }).success).toBe(false)
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, stampHeight: 30 }).success).toBe(false)
  })

  it('rejeita baseMargin fora de 2–10mm', () => {
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, baseMargin: 1 }).success).toBe(false)
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, baseMargin: 12 }).success).toBe(false)
  })

  it('rejeita reliefHeight fora de 1–3mm', () => {
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, reliefHeight: 0.5 }).success).toBe(false)
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, reliefHeight: 4 }).success).toBe(false)
  })

  // --- Cores ---

  it('rejeita cores fora da paleta PLA', () => {
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, cutterColor: '#ff0000' }).success).toBe(false)
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, stampColor: '#000000' }).success).toBe(false)
  })

  // --- productType ---

  it('rejeita productType diferente do literal', () => {
    expect(cutterStampParamsSchema.safeParse({ ...defaultCutterStampParams, productType: 'other' }).success).toBe(false)
  })
})

describe('sanitizeFilename', () => {
  it('substitui caracteres inseguros e tem fallback', () => {
    expect(sanitizeFilename('Meu Cortador! @#')).toBe('Meu_Cortador____')
    expect(sanitizeFilename('')).toBe('cortador-carimbo')
  })
})

describe('PLA_COLORS', () => {
  it('tem pelo menos 10 cores', () => {
    expect(PLA_COLORS.length).toBeGreaterThanOrEqual(10)
  })
})
