import { describe, it, expect } from 'vitest'
import {
  cakeTopperParamsSchema,
  defaultCakeTopperParams,
  defaultText,
  sanitizeFilename,
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
      texts: Array.from({ length: 4 }, (_, i) => ({ ...defaultText, id: `t${i}` })),
    }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects width out of range', () => {
    const invalid = { ...defaultCakeTopperParams, width: 40 }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects baseColor not in PLA_COLORS', () => {
    const invalid = { ...defaultCakeTopperParams, baseColor: '#000000' }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects letterColor not in PLA_COLORS', () => {
    const invalid = { ...defaultCakeTopperParams, letterColor: '#000000' }
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

  it('rejects text content longer than 40 chars', () => {
    const invalid = {
      ...defaultCakeTopperParams,
      texts: [{ ...defaultCakeTopperParams.texts[0], content: 'a'.repeat(41) }],
    }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('PLA_COLORS', () => {
  it('has exactly 10 valid hex colors', () => {
    expect(PLA_COLORS.length).toBe(10)
    for (const color of PLA_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

describe('sanitizeFilename', () => {
  it('strips invalid chars, trims and converts spaces to dashes', () => {
    expect(sanitizeFilename('Meu Topo! @#')).toBe('Meu-Topo')
  })

  it('collapses runs of whitespace into a single dash', () => {
    expect(sanitizeFilename('  a  b  ')).toBe('a-b')
  })

  it('falls back to topo-bolo for only-invalid input', () => {
    expect(sanitizeFilename('@#$')).toBe('topo-bolo')
  })

  it('falls back to topo-bolo for empty input', () => {
    expect(sanitizeFilename('')).toBe('topo-bolo')
  })
})
