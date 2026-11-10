import {
  BASE_BEVEL,
  CONTENT_DEPTH,
  CONTENT_MARGIN,
  PLA_COLORS,
  cardParamsSchema,
  defaultCardParams,
  normalizeName,
  sanitizeFilename,
  textContentSchema,
  type CardContent,
} from '@/features/studio/tools/letreiros/cartao-visita/schema'

function textContent(overrides: Partial<CardContent> = {}): CardContent {
  return {
    ...defaultCardParams.contents[0],
    ...overrides,
  } as CardContent
}

describe('cartao-visita schema', () => {
  it('defaults são válidos', () => {
    expect(cardParamsSchema.parse(defaultCardParams)).toEqual(defaultCardParams)
  })

  it('exporta constantes do domínio', () => {
    expect(CONTENT_DEPTH).toBe(1)
    expect(CONTENT_MARGIN).toBe(3)
    expect(BASE_BEVEL).toBe(0.1)
  })

  it('aceita 1, 2 e 3 conteúdos', () => {
    for (const count of [1, 2, 3]) {
      const contents = defaultCardParams.contents.slice(0, count)
      expect(cardParamsSchema.safeParse({ ...defaultCardParams, contents }).success).toBe(true)
    }
  })

  it('rejeita 0 e 4 conteúdos', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, contents: [] }).success).toBe(false)
    const four = Array.from({ length: 4 }, (_, index) => ({
      ...textContent(),
      id: `c${index}`,
    }))
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, contents: four }).success).toBe(false)
  })

  it('remove layout, textMode e relevo do modelo', () => {
    const parsed = cardParamsSchema.parse({
      ...defaultCardParams,
      layout: 'left',
      textMode: 'engraved',
    })
    expect(parsed).not.toHaveProperty('layout')
    expect(parsed).not.toHaveProperty('textMode')
    expect(parsed.contents[0]).not.toHaveProperty('relief')
  })

  it('aceita texto vazio e sem limite de caracteres', () => {
    const empty = textContent({ content: '' })
    const long = textContent({ content: 'x'.repeat(200) })
    expect(textContentSchema.safeParse(empty).success).toBe(true)
    expect(textContentSchema.safeParse(long).success).toBe(true)
  })

  it('valida os ranges do texto', () => {
    const valid = textContent()
    expect(textContentSchema.safeParse({ ...valid, fontSize: 2.9 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...valid, fontSize: 12.1 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...valid, offsetX: -41 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...valid, offsetY: 41 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...valid, fontSize: 3 }).success).toBe(true)
    expect(textContentSchema.safeParse({ ...valid, fontSize: 12 }).success).toBe(true)
  })

  it('valida os ranges do ícone', () => {
    const icon: CardContent = {
      id: 'icon-1',
      kind: 'icon',
      svgIcon: null,
      iconScale: 1,
      iconLineWidth: 0.3,
      offsetX: 0,
      offsetY: 0,
    }
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, contents: [icon] }).success).toBe(true)
    expect(cardParamsSchema.safeParse({
      ...defaultCardParams,
      contents: [{ ...icon, iconScale: 0.4 }],
    }).success).toBe(false)
    expect(cardParamsSchema.safeParse({
      ...defaultCardParams,
      contents: [{ ...icon, iconLineWidth: 1.6 }],
    }).success).toBe(false)
  })

  it('valida dimensões, espessura e cantos', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, width: 49 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, width: 90 }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, height: 29 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, height: 60 }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, thickness: 0.9 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, thickness: 3 }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, cornerRadius: 11 }).success).toBe(false)
  })

  it('aceita apenas cores PLA válidas', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, baseColor: '#14b8a6' }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, baseColor: '#ff0000' }).success).toBe(false)
    expect(PLA_COLORS).toHaveLength(10)
  })

  it('productType é literal card', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, productType: 'keychain' }).success).toBe(false)
  })

  it('normalizeName remove acentos e cedilha', () => {
    expect(normalizeName('José Ção')).toBe('Jose Cao')
  })

  it('sanitizeFilename remove caracteres inválidos e acentos', () => {
    expect(sanitizeFilename('Meu Cartão! @#')).toBe('Meu-Cartao')
    expect(sanitizeFilename('Cartão')).toBe('Cartao')
    expect(sanitizeFilename('')).toBe('cartao-visita')
  })
})
