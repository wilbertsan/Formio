import { describe, it, expect } from 'vitest'
import {
  cakeTopperParamsSchema,
  defaultCakeTopperParams,
  PLA_COLORS,
} from '@/features/studio/tools/confeitaria/topo-bolo/schema'

describe('cakeTopperParamsSchema', () => {
  it('validates default params', () => {
    const result = cakeTopperParamsSchema.safeParse(defaultCakeTopperParams)
    expect(result.success).toBe(true)
  })

  it('rejects invalid shape', () => {
    const invalid = { ...defaultCakeTopperParams, shape: 'triangle' }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects invalid textMode', () => {
    const invalid = { ...defaultCakeTopperParams, textMode: 'x' }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects invalid supportType', () => {
    const invalid = { ...defaultCakeTopperParams, supportType: 'x' }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects more than 3 texts', () => {
    const invalid = {
      ...defaultCakeTopperParams,
      texts: [
        defaultCakeTopperParams.texts[0],
        defaultCakeTopperParams.texts[0],
        defaultCakeTopperParams.texts[0],
        defaultCakeTopperParams.texts[0],
      ],
    }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects width out of range', () => {
    const invalid = { ...defaultCakeTopperParams, width: 40 }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('accepts shape custom with contourSvg set', () => {
    const valid = {
      ...defaultCakeTopperParams,
      shape: 'custom' as const,
      contourSvg: '<svg></svg>',
    }
    const result = cakeTopperParamsSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects empty text content', () => {
    const invalid = {
      ...defaultCakeTopperParams,
      texts: [{ ...defaultCakeTopperParams.texts[0], content: '' }],
    }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('PLA_COLORS', () => {
  it('has at least 10 colors', () => {
    expect(PLA_COLORS.length).toBeGreaterThanOrEqual(10)
  })
})
