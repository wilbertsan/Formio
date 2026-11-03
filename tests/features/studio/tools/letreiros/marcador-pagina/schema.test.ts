import {
  defaultBookmarkParams,
  bookmarkParamsSchema,
  textSchema,
  patternSchema,
  sanitizeFilename,
  PLA_COLORS,
  PATTERN_CELL_MM,
} from '@/features/studio/tools/letreiros/marcador-pagina/schema'

describe('bookmark schema', () => {
  it('defaults são válidos', () => {
    expect(bookmarkParamsSchema.parse(defaultBookmarkParams)).toEqual(defaultBookmarkParams)
  })

  it('defaults medem 50mm de largura, 100mm de comprimento e 1mm de espessura', () => {
    expect(defaultBookmarkParams.width).toBe(50)
    expect(defaultBookmarkParams.length).toBe(100)
    expect(defaultBookmarkParams.thickness).toBe(1)
    expect(defaultBookmarkParams.text.content).toBe('Meu nome')
    expect(defaultBookmarkParams.text.fontStyle).toBe('bold')
    expect(defaultBookmarkParams.text.relief).toBe(1)
  })

  it('aceita um texto único, sem limite de caracteres', () => {
    const content = 'a'.repeat(200)
    expect(
      bookmarkParamsSchema.safeParse({
        ...defaultBookmarkParams,
        text: { ...defaultBookmarkParams.text, content },
      }).success,
    ).toBe(true)
  })

  it('rejeita conteúdo vazio ou só com espaços', () => {
    expect(
      bookmarkParamsSchema.safeParse({
        ...defaultBookmarkParams,
        text: { ...defaultBookmarkParams.text, content: '' },
      }).success,
    ).toBe(false)
    expect(
      bookmarkParamsSchema.safeParse({
        ...defaultBookmarkParams,
        text: { ...defaultBookmarkParams.text, content: '   ' },
      }).success,
    ).toBe(false)
  })

  it('content faz trim', () => {
    const result = textSchema.safeParse({ ...defaultBookmarkParams.text, content: '  test  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content).toBe('test')
    }
  })

  it('não expõe lista de textos nem posicionamento', () => {
    expect('texts' in defaultBookmarkParams).toBe(false)
    expect('offsetX' in defaultBookmarkParams.text).toBe(false)
    expect('offsetY' in defaultBookmarkParams.text).toBe(false)
    expect('id' in defaultBookmarkParams.text).toBe(false)
    expect('proportional' in defaultBookmarkParams.text).toBe(false)
  })

  it('height tem range 4-40', () => {
    const text = defaultBookmarkParams.text
    expect(textSchema.safeParse({ ...text, height: 3 }).success).toBe(false)
    expect(textSchema.safeParse({ ...text, height: 41 }).success).toBe(false)
    expect(textSchema.safeParse({ ...text, height: 4 }).success).toBe(true)
    expect(textSchema.safeParse({ ...text, height: 40 }).success).toBe(true)
  })

  it('width tem range 8-60', () => {
    const text = defaultBookmarkParams.text
    expect(textSchema.safeParse({ ...text, width: 7 }).success).toBe(false)
    expect(textSchema.safeParse({ ...text, width: 61 }).success).toBe(false)
    expect(textSchema.safeParse({ ...text, width: 8 }).success).toBe(true)
    expect(textSchema.safeParse({ ...text, width: 60 }).success).toBe(true)
  })

  it('relief (espessura da parede) tem range 0.4-2', () => {
    const text = defaultBookmarkParams.text
    expect(textSchema.safeParse({ ...text, relief: 0.3 }).success).toBe(false)
    expect(textSchema.safeParse({ ...text, relief: 2.1 }).success).toBe(false)
    expect(textSchema.safeParse({ ...text, relief: 0.4 }).success).toBe(true)
    expect(textSchema.safeParse({ ...text, relief: 2 }).success).toBe(true)
  })

  it('fontStyle aceita normal, bold e serif', () => {
    const text = defaultBookmarkParams.text
    expect(textSchema.safeParse({ ...text, fontStyle: 'normal' }).success).toBe(true)
    expect(textSchema.safeParse({ ...text, fontStyle: 'bold' }).success).toBe(true)
    expect(textSchema.safeParse({ ...text, fontStyle: 'serif' }).success).toBe(true)
    expect(textSchema.safeParse({ ...text, fontStyle: 'italic' }).success).toBe(false)
  })

  it('length tem range 50-150', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, length: 49 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, length: 151 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, length: 100 }).success).toBe(true)
  })

  it('width tem range 30-50', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, width: 29 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, width: 51 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, width: 50 }).success).toBe(true)
  })

  it('thickness tem range 1-2', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, thickness: 0.9 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, thickness: 2.1 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, thickness: 1 }).success).toBe(true)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, thickness: 2 }).success).toBe(true)
  })

  it('defaults da textura: sem padrão, densidade média e 0.8mm', () => {
    expect(defaultBookmarkParams.pattern).toEqual({
      type: 'none',
      density: 'medium',
      depth: 0.8,
      svg: null,
    })
    expect(PATTERN_CELL_MM).toEqual({ low: 12, medium: 8, high: 5 })
  })

  it('aceita os tipos de textura', () => {
    const pattern = defaultBookmarkParams.pattern
    for (const type of ['none', 'triangles', 'squares', 'circles', 'diamonds', 'svg']) {
      expect(patternSchema.safeParse({ ...pattern, type }).success).toBe(true)
    }
    expect(patternSchema.safeParse({ ...pattern, type: 'stars' }).success).toBe(false)
  })

  it('aceita as densidades low, medium e high', () => {
    const pattern = defaultBookmarkParams.pattern
    for (const density of ['low', 'medium', 'high']) {
      expect(patternSchema.safeParse({ ...pattern, density }).success).toBe(true)
    }
    expect(patternSchema.safeParse({ ...pattern, density: 'ultra' }).success).toBe(false)
  })

  it('profundidade da textura tem range 0.4-1.5', () => {
    const pattern = defaultBookmarkParams.pattern
    expect(patternSchema.safeParse({ ...pattern, depth: 0.3 }).success).toBe(false)
    expect(patternSchema.safeParse({ ...pattern, depth: 1.6 }).success).toBe(false)
    expect(patternSchema.safeParse({ ...pattern, depth: 0.4 }).success).toBe(true)
    expect(patternSchema.safeParse({ ...pattern, depth: 1.5 }).success).toBe(true)
  })

  it('svg da textura aceita null e string', () => {
    const pattern = defaultBookmarkParams.pattern
    expect(patternSchema.safeParse({ ...pattern, svg: null }).success).toBe(true)
    expect(patternSchema.safeParse({ ...pattern, svg: '<svg/>' }).success).toBe(true)
  })

  it('não expõe parâmetros de furo', () => {
    expect('holeDiameter' in defaultBookmarkParams).toBe(false)
    expect('holeMargin' in defaultBookmarkParams).toBe(false)
  })

  it('sanitizeFilename gera nome seguro', () => {
    expect(sanitizeFilename('Meu Marcador! @#')).toBe('Meu-Marcador')
    expect(sanitizeFilename('///')).toBe('marcador')
    expect(sanitizeFilename('  spaces  ')).toBe('spaces')
    expect(sanitizeFilename('áéíóú')).toBe('marcador')
  })

  it('baseColor aceita cores PLA válidas', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, baseColor: '#14b8a6' }).success).toBe(true)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, baseColor: '#invalid' }).success).toBe(false)
  })

  it('letterColor aceita cores PLA válidas', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, letterColor: '#f5f5f5' }).success).toBe(true)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, letterColor: '#invalid' }).success).toBe(false)
  })

  it('não expõe modo de texto (apenas parede em relevo)', () => {
    expect('textMode' in defaultBookmarkParams).toBe(false)
    expect('textMode' in bookmarkParamsSchema.shape).toBe(false)
  })

  it('PLA_COLORS tem 10 cores', () => {
    expect(PLA_COLORS).toHaveLength(10)
  })

  it('productType deve ser bookmark', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, productType: 'bookmark' }).success).toBe(true)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, productType: 'keychain' }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, productType: 'card' }).success).toBe(false)
  })
})
