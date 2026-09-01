import { describe, it, expect } from 'vitest'
import { stampParamsSchema, defaultStampParams } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/schema'

describe('stampParamsSchema', () => {
  it('validates default params', () => {
    const result = stampParamsSchema.safeParse(defaultStampParams)
    expect(result.success).toBe(true)
  })

  it('rejects diameter below 10mm', () => {
    const invalid = { ...defaultStampParams, diameter: 5 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects diameter above 30mm', () => {
    const invalid = { ...defaultStampParams, diameter: 35 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects height below 15mm', () => {
    const invalid = { ...defaultStampParams, height: 10 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects height above 25mm', () => {
    const invalid = { ...defaultStampParams, height: 30 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects text longer than 30 chars', () => {
    const invalid = { ...defaultStampParams, text: 'a'.repeat(31) }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects fontSize below 6mm', () => {
    const invalid = { ...defaultStampParams, fontSize: 5 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects fontSize above 15mm', () => {
    const invalid = { ...defaultStampParams, fontSize: 16 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('validates reliefType as negative or positive', () => {
    const valid1 = { ...defaultStampParams, reliefType: 'negative' }
    const valid2 = { ...defaultStampParams, reliefType: 'positive' }
    expect(stampParamsSchema.safeParse(valid1).success).toBe(true)
    expect(stampParamsSchema.safeParse(valid2).success).toBe(true)
  })

  it('rejects invalid reliefType', () => {
    const invalid = { ...defaultStampParams, reliefType: 'invalid' }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
