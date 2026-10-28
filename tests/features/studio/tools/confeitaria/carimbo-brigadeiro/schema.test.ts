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

  it('rejects empty text', () => {
    const invalid = { ...defaultStampParams, text: '' }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects invalid fontStyle', () => {
    const invalid = { ...defaultStampParams, fontStyle: 'italic' }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects iconScale below 0.5', () => {
    const invalid = { ...defaultStampParams, iconScale: 0.3 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects iconScale above 1.0', () => {
    const invalid = { ...defaultStampParams, iconScale: 1.5 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects iconLineWidth below 0.1', () => {
    const invalid = { ...defaultStampParams, iconLineWidth: 0.05 }
    expect(stampParamsSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects iconLineWidth above 1.5', () => {
    const invalid = { ...defaultStampParams, iconLineWidth: 2 }
    expect(stampParamsSchema.safeParse(invalid).success).toBe(false)
  })

  it('accepts contentType text or svg', () => {
    expect(stampParamsSchema.safeParse({ ...defaultStampParams, contentType: 'text' }).success).toBe(true)
    expect(stampParamsSchema.safeParse({ ...defaultStampParams, contentType: 'svg' }).success).toBe(true)
  })

  it('rejects invalid contentType', () => {
    const invalid = { ...defaultStampParams, contentType: 'image' }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects invalid baseColor', () => {
    const invalid = { ...defaultStampParams, baseColor: '#ff0000' }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects invalid reliefColor', () => {
    const invalid = { ...defaultStampParams, reliefColor: '#000000' }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('accepts null svgIcon', () => {
    const valid = { ...defaultStampParams, svgIcon: null }
    const result = stampParamsSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects non-literal productType', () => {
    const invalid = { ...defaultStampParams, productType: 'other' }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
