import { describe, it, expect } from 'vitest'
import { cutterStampParamsSchema, defaultCutterStampParams, PLA_COLORS } from '@/features/studio/tools/confeitaria/cortador-carimbo/schema'

describe('cutterStampParamsSchema', () => {
  it('validates default params', () => {
    const result = cutterStampParamsSchema.safeParse(defaultCutterStampParams)
    expect(result.success).toBe(true)
  })

  // --- Outer shape ---

  it('accepts circle shape', () => {
    const params = { ...defaultCutterStampParams, outerShape: 'circle' as const }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(true)
  })

  it('accepts rectangle shape', () => {
    const params = { ...defaultCutterStampParams, outerShape: 'rectangle' as const }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(true)
  })

  it('accepts star shape', () => {
    const params = { ...defaultCutterStampParams, outerShape: 'star' as const }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(true)
  })

  it('rejects invalid outerShape', () => {
    const params = { ...defaultCutterStampParams, outerShape: 'triangle' }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  // --- Dimensions ---

  it('rejects diameter below 30mm', () => {
    const params = { ...defaultCutterStampParams, diameter: 20 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects diameter above 80mm', () => {
    const params = { ...defaultCutterStampParams, diameter: 90 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects rectWidth below 30mm', () => {
    const params = { ...defaultCutterStampParams, rectWidth: 20 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects rectWidth above 80mm', () => {
    const params = { ...defaultCutterStampParams, rectWidth: 90 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects rectHeight below 30mm', () => {
    const params = { ...defaultCutterStampParams, rectHeight: 20 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects rectHeight above 80mm', () => {
    const params = { ...defaultCutterStampParams, rectHeight: 90 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  // --- Wall ---

  it('rejects wallHeight below 15mm', () => {
    const params = { ...defaultCutterStampParams, wallHeight: 10 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects wallHeight above 40mm', () => {
    const params = { ...defaultCutterStampParams, wallHeight: 45 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects wallThickness below 0.8mm', () => {
    const params = { ...defaultCutterStampParams, wallThickness: 0.5 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects wallThickness above 2mm', () => {
    const params = { ...defaultCutterStampParams, wallThickness: 3 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  // --- Stamp ---

  it('rejects stampHeight below 5mm', () => {
    const params = { ...defaultCutterStampParams, stampHeight: 3 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects stampHeight above 20mm', () => {
    const params = { ...defaultCutterStampParams, stampHeight: 25 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects stampHeight >= wallHeight', () => {
    const params = { ...defaultCutterStampParams, wallHeight: 15, stampHeight: 15 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  // --- Central content ---

  it('accepts text-only content', () => {
    const params = {
      ...defaultCutterStampParams,
      centralShape: null,
      text: 'Ola',
    }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(true)
  })

  it('accepts shape-only content', () => {
    const params = {
      ...defaultCutterStampParams,
      text: '',
      centralShape: 'circle' as const,
    }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(true)
  })

  it('rejects empty text with no central shape', () => {
    const params = {
      ...defaultCutterStampParams,
      text: '',
      centralShape: null,
    }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects text longer than 30 chars', () => {
    const params = { ...defaultCutterStampParams, text: 'a'.repeat(31) }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('accepts centralShape circle', () => {
    const params = { ...defaultCutterStampParams, centralShape: 'circle' as const }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(true)
  })

  it('accepts centralShape star', () => {
    const params = { ...defaultCutterStampParams, centralShape: 'star' as const }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(true)
  })

  it('accepts centralShape heart', () => {
    const params = { ...defaultCutterStampParams, centralShape: 'heart' as const }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(true)
  })

  it('rejects invalid centralShape', () => {
    const params = { ...defaultCutterStampParams, centralShape: 'diamond' }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  // --- Font ---

  it('rejects invalid fontStyle', () => {
    const params = { ...defaultCutterStampParams, fontStyle: 'italic' }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects fontSize below 5mm', () => {
    const params = { ...defaultCutterStampParams, fontSize: 3 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects fontSize above 15mm', () => {
    const params = { ...defaultCutterStampParams, fontSize: 20 }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  // --- Colors ---

  it('rejects invalid baseColor', () => {
    const params = { ...defaultCutterStampParams, baseColor: '#ff0000' }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  it('rejects invalid stampColor', () => {
    const params = { ...defaultCutterStampParams, stampColor: '#000000' }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })

  // --- productType ---

  it('rejects non-literal productType', () => {
    const params = { ...defaultCutterStampParams, productType: 'other' }
    expect(cutterStampParamsSchema.safeParse(params).success).toBe(false)
  })
})

describe('PLA_COLORS', () => {
  it('has at least 10 colors', () => {
    expect(PLA_COLORS.length).toBeGreaterThanOrEqual(10)
  })
})
