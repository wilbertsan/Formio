import {
  defaultBookmarkParams,
  bookmarkParamsSchema,
  textItemSchema,
} from '@/features/studio/tools/letreiros/marcador-pagina/schema'

describe('bookmark schema', () => {
  it('defaults são válidos', () => {
    expect(bookmarkParamsSchema.parse(defaultBookmarkParams)).toEqual(defaultBookmarkParams)
  })

  it('aceita 1, 2 e 3 textos', () => {
    for (const count of [1, 2, 3]) {
      const texts = Array.from({ length: count }, (_, i) => ({
        ...defaultBookmarkParams.texts[0],
        id: `t${i}`,
      }))
      expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, texts }).success).toBe(true)
    }
  })

  it('rejeita 0 textos e 4 textos', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, texts: [] }).success).toBe(false)
    const four = Array.from({ length: 4 }, (_, i) => ({ ...defaultBookmarkParams.texts[0], id: `t${i}` }))
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, texts: four }).success).toBe(false)
  })

  it('textItemSchema valida ranges corretamente', () => {
    const valid = defaultBookmarkParams.texts[0]
    expect(textItemSchema.parse(valid)).toEqual(valid)
    expect(textItemSchema.safeParse({ ...valid, content: '' }).success).toBe(false)
    expect(textItemSchema.safeParse({ ...valid, width: 3 }).success).toBe(false)
    expect(textItemSchema.safeParse({ ...valid, height: 25 }).success).toBe(false)
    expect(textItemSchema.safeParse({ ...valid, offsetX: 25 }).success).toBe(false)
  })

  it('length tem range 50-150', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, length: 49 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, length: 151 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, length: 120 }).success).toBe(true)
  })

  it('width tem range 30-50', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, width: 29 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, width: 51 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, width: 40 }).success).toBe(true)
  })

  it('thickness é literal 2', () => {
    expect(bookmarkParamsSchema.shape.thickness.value).toBe(2)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, thickness: 3 }).success).toBe(false)
  })

  it('holeDiameter tem range 3-8', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeDiameter: 2 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeDiameter: 9 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeDiameter: 5 }).success).toBe(true)
  })

  it('holeMargin tem range 5-15', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeMargin: 4 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeMargin: 16 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeMargin: 10 }).success).toBe(true)
  })
})
