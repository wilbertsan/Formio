import { describe, it, expect } from 'vitest'
import {
  PLA_COLORS,
  textItemSchema,
  placaLojaParamsSchema,
  defaultText,
  defaultPlacaLojaParams,
  sanitizeFilename,
} from '@/features/studio/tools/letreiros/placa-loja/schema'

describe('PLA_COLORS', () => {
  it('has exactly 10 colors', () => {
    expect(PLA_COLORS).toHaveLength(10)
  })

  it('all colors are valid hex', () => {
    for (const color of PLA_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

describe('textItemSchema', () => {
  const validText = {
    id: 'text-1',
    content: 'Loja',
    fontStyle: 'bold' as const,
    width: 80,
    height: 20,
    relief: 1,
    proportional: false,
    offsetX: 0,
    offsetY: 0,
  }

  it('accepts valid text item', () => {
    const result = textItemSchema.safeParse(validText)
    expect(result.success).toBe(true)
  })

  it('rejects empty id', () => {
    const result = textItemSchema.safeParse({ ...validText, id: '' })
    expect(result.success).toBe(false)
  })

  it('rejects content longer than 30 chars', () => {
    const result = textItemSchema.safeParse({
      ...validText,
      content: 'a'.repeat(31),
    })
    expect(result.success).toBe(false)
  })

  it('accepts content up to 30 chars', () => {
    const result = textItemSchema.safeParse({
      ...validText,
      content: 'a'.repeat(30),
    })
    expect(result.success).toBe(true)
  })

  it('rejects width below 20', () => {
    const result = textItemSchema.safeParse({ ...validText, width: 19 })
    expect(result.success).toBe(false)
  })

  it('rejects width above 200', () => {
    const result = textItemSchema.safeParse({ ...validText, width: 201 })
    expect(result.success).toBe(false)
  })

  it('rejects height below 5', () => {
    const result = textItemSchema.safeParse({ ...validText, height: 4 })
    expect(result.success).toBe(false)
  })

  it('rejects height above 40', () => {
    const result = textItemSchema.safeParse({ ...validText, height: 41 })
    expect(result.success).toBe(false)
  })

  it('rejects relief below 0.4', () => {
    const result = textItemSchema.safeParse({ ...validText, relief: 0.3 })
    expect(result.success).toBe(false)
  })

  it('rejects relief above 3', () => {
    const result = textItemSchema.safeParse({ ...validText, relief: 3.1 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid fontStyle', () => {
    const result = textItemSchema.safeParse({
      ...validText,
      fontStyle: 'italic',
    })
    expect(result.success).toBe(false)
  })
})

describe('placaLojaParamsSchema', () => {
  const validParams = {
    productType: 'placa-loja' as const,
    width: 200,
    height: 100,
    thickness: 5,
    shape: 'rectangular' as const,
    cornerRadius: 10,
    screwHoleDiameter: 5,
    screwHoleMargin: 10,
    textMode: 'raised' as const,
    baseColor: '#14b8a6' as const,
    letterColor: '#f5f5f5' as const,
    texts: [
      {
        id: 'text-1',
        content: 'Minha Loja',
        fontStyle: 'bold' as const,
        width: 150,
        height: 30,
        relief: 1.5,
        proportional: false,
        offsetX: 0,
        offsetY: 0,
      },
    ],
  }

  it('accepts valid params', () => {
    const result = placaLojaParamsSchema.safeParse(validParams)
    expect(result.success).toBe(true)
  })

  it('rejects width below 100', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      width: 99,
    })
    expect(result.success).toBe(false)
  })

  it('rejects width above 300', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      width: 301,
    })
    expect(result.success).toBe(false)
  })

  it('rejects height below 50', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      height: 49,
    })
    expect(result.success).toBe(false)
  })

  it('rejects height above 150', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      height: 151,
    })
    expect(result.success).toBe(false)
  })

  it('rejects thickness below 3', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      thickness: 2,
    })
    expect(result.success).toBe(false)
  })

  it('rejects thickness above 8', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      thickness: 9,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid shape', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      shape: 'circle',
    })
    expect(result.success).toBe(false)
  })

  it('accepts rounded shape', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      shape: 'rounded',
    })
    expect(result.success).toBe(true)
  })

  it('rejects cornerRadius below 5', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      cornerRadius: 4,
    })
    expect(result.success).toBe(false)
  })

  it('rejects cornerRadius above 20', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      cornerRadius: 21,
    })
    expect(result.success).toBe(false)
  })

  it('rejects screwHoleDiameter below 4', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      screwHoleDiameter: 3,
    })
    expect(result.success).toBe(false)
  })

  it('rejects screwHoleDiameter above 6', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      screwHoleDiameter: 7,
    })
    expect(result.success).toBe(false)
  })

  it('rejects screwHoleMargin below 5', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      screwHoleMargin: 4,
    })
    expect(result.success).toBe(false)
  })

  it('rejects screwHoleMargin above 15', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      screwHoleMargin: 16,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid textMode', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      textMode: 'carved',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid baseColor', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      baseColor: '#ff0000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid letterColor', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      letterColor: '#000000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty texts array', () => {
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      texts: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects more than 5 texts', () => {
    const texts = Array.from({ length: 6 }, (_, i) => ({
      id: `text-${i + 1}`,
      content: `Text ${i + 1}`,
      fontStyle: 'normal' as const,
      width: 50,
      height: 15,
      relief: 1,
      proportional: false,
      offsetX: 0,
      offsetY: 0,
    }))
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      texts,
    })
    expect(result.success).toBe(false)
  })

  it('accepts exactly 5 texts', () => {
    const texts = Array.from({ length: 5 }, (_, i) => ({
      id: `text-${i + 1}`,
      content: `Text ${i + 1}`,
      fontStyle: 'normal' as const,
      width: 50,
      height: 15,
      relief: 1,
      proportional: false,
      offsetX: 0,
      offsetY: 0,
    }))
    const result = placaLojaParamsSchema.safeParse({
      ...validParams,
      texts,
    })
    expect(result.success).toBe(true)
  })
})

describe('defaultText', () => {
  it('is valid according to textItemSchema', () => {
    const result = textItemSchema.safeParse(defaultText)
    expect(result.success).toBe(true)
  })
})

describe('defaultPlacaLojaParams', () => {
  it('is valid according to placaLojaParamsSchema', () => {
    const result = placaLojaParamsSchema.safeParse(defaultPlacaLojaParams)
    expect(result.success).toBe(true)
  })
})

describe('sanitizeFilename', () => {
  it('removes special characters', () => {
    expect(sanitizeFilename('Loja @#$%')).toBe('Loja')
  })

  it('replaces spaces with hyphens', () => {
    expect(sanitizeFilename('Minha Loja')).toBe('Minha-Loja')
  })

  it('trims whitespace', () => {
    expect(sanitizeFilename('  Loja  ')).toBe('Loja')
  })

  it('returns default for empty string', () => {
    expect(sanitizeFilename('')).toBe('placa')
  })

  it('returns default for only special chars', () => {
    expect(sanitizeFilename('@#$%')).toBe('placa')
  })

  it('preserves hyphens and underscores', () => {
    expect(sanitizeFilename('my-shop_name')).toBe('my-shop_name')
  })
})
