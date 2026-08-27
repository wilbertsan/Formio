import {
  defaultCardParams,
  cardParamsSchema,
  textBlockSchema,
  MARGIN_MIN,
  PLA_COLORS,
} from '@/features/studio/tools/letreiros/cartao-visita/schema'

describe('cartao-visita schema', () => {
  it('defaults são válidos', () => {
    expect(cardParamsSchema.parse(defaultCardParams)).toEqual(defaultCardParams)
  })

  it('aceita 1, 2 e 3 blocos de texto', () => {
    for (const count of [1, 2, 3]) {
      const blocks = Array.from({ length: count }, (_, i) => ({
        ...defaultCardParams.blocks[0],
        id: `b${i}`,
      }))
      expect(cardParamsSchema.safeParse({ ...defaultCardParams, blocks }).success).toBe(true)
    }
  })

  it('rejeita 0 blocos e 4 blocos', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, blocks: [] }).success).toBe(false)
    const four = Array.from({ length: 4 }, (_, i) => ({ ...defaultCardParams.blocks[0], id: `b${i}` }))
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, blocks: four }).success).toBe(false)
  })

  it('textBlockSchema valida ranges corretamente', () => {
    const valid = defaultCardParams.blocks[0]
    expect(textBlockSchema.parse(valid)).toEqual(valid)
    expect(textBlockSchema.safeParse({ ...valid, content: '' }).success).toBe(false)
    expect(textBlockSchema.safeParse({ ...valid, content: 'x'.repeat(31) }).success).toBe(false)
    expect(textBlockSchema.safeParse({ ...valid, fontSize: 2 }).success).toBe(false)
    expect(textBlockSchema.safeParse({ ...valid, fontSize: 13 }).success).toBe(false)
    expect(textBlockSchema.safeParse({ ...valid, relief: 0.2 }).success).toBe(false)
    expect(textBlockSchema.safeParse({ ...valid, relief: 1.6 }).success).toBe(false)
    expect(textBlockSchema.safeParse({ ...valid, offsetX: 31 }).success).toBe(false)
    expect(textBlockSchema.safeParse({ ...valid, offsetY: 31 }).success).toBe(false)
  })

  it('width rejeita abaixo de 50mm', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, width: 49 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, width: 50 }).success).toBe(true)
  })

  it('width rejeita acima de 90mm', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, width: 91 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, width: 90 }).success).toBe(true)
  })

  it('height rejeita abaixo de 30mm', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, height: 29 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, height: 30 }).success).toBe(true)
  })

  it('height rejeita acima de 60mm', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, height: 61 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, height: 60 }).success).toBe(true)
  })

  it('thickness rejeita abaixo de 1mm e acima de 3mm', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, thickness: 0 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, thickness: 4 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, thickness: 2 }).success).toBe(true)
  })

  it('cornerRadius rejeita negativo e acima de 10mm', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, cornerRadius: -1 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, cornerRadius: 11 }).success).toBe(false)
  })

  it('layout aceita centered e left', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, layout: 'centered' }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, layout: 'left' }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, layout: 'right' }).success).toBe(false)
  })

  it('textMode aceita raised e engraved', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, textMode: 'raised' }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, textMode: 'engraved' }).success).toBe(true)
  })

  it('baseColor e letterColor são PLA_COLORS válidos', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, baseColor: '#14b8a6' }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, letterColor: '#f5f5f5' }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, baseColor: '#ff0000' }).success).toBe(false)
  })

  it('exporta MARGIN_MIN', () => {
    expect(MARGIN_MIN).toBe(3)
  })

  it('exporta PLA_COLORS com 10 cores', () => {
    expect(PLA_COLORS).toHaveLength(10)
  })

  it('productType é literal card', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, productType: 'keychain' }).success).toBe(false)
  })
})
