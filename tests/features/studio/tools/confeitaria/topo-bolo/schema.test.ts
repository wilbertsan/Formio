import { describe, it, expect } from 'vitest'
import { cakeTopperParamsSchema, defaultCakeTopperParams, PLA_COLORS } from '@/features/studio/tools/confeitaria/topo-bolo/schema'

describe('cakeTopperParamsSchema', () => {
  it('validates default params', () => {
    const result = cakeTopperParamsSchema.safeParse(defaultCakeTopperParams)
    expect(result.success).toBe(true)
  })

  it('rejects invalid text (empty)', () => {
    const invalid = { ...defaultCakeTopperParams, text: '' }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects text longer than 40 chars', () => {
    const invalid = { ...defaultCakeTopperParams, text: 'a'.repeat(41) }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects width out of range', () => {
    const invalid = { ...defaultCakeTopperParams, width: 40 }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects invalid shape', () => {
    const invalid = { ...defaultCakeTopperParams, shape: 'triangle' }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects invalid baseColor', () => {
    const invalid = { ...defaultCakeTopperParams, baseColor: '#000000' }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('PLA_COLORS', () => {
  it('has at least 10 colors', () => {
    expect(PLA_COLORS.length).toBeGreaterThanOrEqual(10)
  })
})
