import { describe, it, expect } from 'vitest'
import { cakeStandParamsSchema, defaultCakeStandParams, HEIGHT_MAP } from '@/features/studio/tools/confeitaria/suporte-bolo/schema'

describe('cakeStandParamsSchema', () => {
  it('valida parâmetros corretos', () => {
    const result = cakeStandParamsSchema.safeParse(defaultCakeStandParams)
    expect(result.success).toBe(true)
  })

  it('rejeita baseDiameter abaixo do mínimo', () => {
    const result = cakeStandParamsSchema.safeParse({
      ...defaultCakeStandParams,
      baseDiameter: 70,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita baseDiameter acima do máximo', () => {
    const result = cakeStandParamsSchema.safeParse({
      ...defaultCakeStandParams,
      baseDiameter: 250,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita thickness abaixo do mínimo', () => {
    const result = cakeStandParamsSchema.safeParse({
      ...defaultCakeStandParams,
      thickness: 2,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita height inválido', () => {
    const result = cakeStandParamsSchema.safeParse({
      ...defaultCakeStandParams,
      height: 'extra-tall',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita baseDecoration inválido', () => {
    const result = cakeStandParamsSchema.safeParse({
      ...defaultCakeStandParams,
      baseDecoration: 'floral',
    })
    expect(result.success).toBe(false)
  })

  it('aceita todas as alturas válidas', () => {
    for (const h of ['low', 'medium', 'high'] as const) {
      const result = cakeStandParamsSchema.safeParse({
        ...defaultCakeStandParams,
        height: h,
      })
      expect(result.success).toBe(true)
    }
  })

  it('aceita todas as decorações válidas', () => {
    for (const d of ['none', 'hexagon', 'lines', 'waves'] as const) {
      const result = cakeStandParamsSchema.safeParse({
        ...defaultCakeStandParams,
        baseDecoration: d,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('HEIGHT_MAP', () => {
  it('contém 3 alturas predefinidas', () => {
    expect(Object.keys(HEIGHT_MAP)).toHaveLength(3)
    expect(HEIGHT_MAP.low).toBe(40)
    expect(HEIGHT_MAP.medium).toBe(60)
    expect(HEIGHT_MAP.high).toBe(80)
  })
})

describe('defaultCakeStandParams', () => {
  it('tem todos os campos obrigatórios', () => {
    expect(defaultCakeStandParams.productType).toBe('cake-stand')
    expect(defaultCakeStandParams.baseDiameter).toBe(150)
    expect(defaultCakeStandParams.height).toBe('medium')
    expect(defaultCakeStandParams.thickness).toBe(4)
    expect(defaultCakeStandParams.plateHasRim).toBe(true)
    expect(defaultCakeStandParams.rimHeight).toBe(8)
    expect(defaultCakeStandParams.baseDecoration).toBe('hexagon')
    expect(defaultCakeStandParams.baseColor).toBe('#14b8a6')
  })
})