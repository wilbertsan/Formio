import {
  CONTENT_DEPTH,
  CONTENT_MARGIN,
  PHOTO_SIZE_KEYS,
  PHOTO_SIZES,
  PLATE_REAR_MIN,
  PLA_COLORS,
  SLOT_GAP,
  defaultPhotoStandParams,
  iconContentSchema,
  normalizeName,
  photoStandParamsSchema,
  sanitizeFilename,
  textContentSchema,
} from '@/features/studio/tools/letreiros/suporte-foto/schema'

describe('suporte-foto schema', () => {
  it('defaults são válidos', () => {
    expect(photoStandParamsSchema.parse(defaultPhotoStandParams)).toEqual(defaultPhotoStandParams)
  })

  it('exporta constantes do domínio', () => {
    expect(CONTENT_DEPTH).toBe(1)
    expect(CONTENT_MARGIN).toBe(3)
    expect(SLOT_GAP).toBe(2)
    expect(PLATE_REAR_MIN).toBe(2)
  })

  it('define os três tamanhos de foto', () => {
    expect(PHOTO_SIZE_KEYS).toEqual(['10x15', '13x18', '15x20'])
    expect(PHOTO_SIZES['10x15']).toEqual({ width: 100, height: 150 })
    expect(PHOTO_SIZES['13x18']).toEqual({ width: 130, height: 180 })
    expect(PHOTO_SIZES['15x20']).toEqual({ width: 150, height: 200 })
  })

  it('aceita 1, 2 e 3 conteúdos', () => {
    for (const count of [1, 2, 3]) {
      const contents = Array.from({ length: count }, (_, index) => ({
        ...defaultPhotoStandParams.contents[0],
        id: `c${index}`,
      }))
      expect(photoStandParamsSchema.safeParse({ ...defaultPhotoStandParams, contents }).success).toBe(true)
    }
  })

  it('rejeita 0 e 4 conteúdos', () => {
    expect(photoStandParamsSchema.safeParse({ ...defaultPhotoStandParams, contents: [] }).success).toBe(false)
    const four = Array.from({ length: 4 }, (_, index) => ({
      ...defaultPhotoStandParams.contents[0],
      id: `c${index}`,
    }))
    expect(photoStandParamsSchema.safeParse({ ...defaultPhotoStandParams, contents: four }).success).toBe(false)
  })

  it('aceita texto vazio e sem limite de caracteres', () => {
    const base = defaultPhotoStandParams.contents[0]
    if (base.kind !== 'text') throw new Error('conteúdo inesperado')
    expect(textContentSchema.safeParse({ ...base, content: '' }).success).toBe(true)
    expect(textContentSchema.safeParse({ ...base, content: 'x'.repeat(200) }).success).toBe(true)
  })

  it('valida os ranges do texto', () => {
    const base = defaultPhotoStandParams.contents[0]
    if (base.kind !== 'text') throw new Error('conteúdo inesperado')
    expect(textContentSchema.safeParse({ ...base, fontSize: 2.9 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...base, fontSize: 15.1 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...base, offsetX: -91 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...base, offsetY: 26 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...base, fontSize: 3 }).success).toBe(true)
    expect(textContentSchema.safeParse({ ...base, fontSize: 15 }).success).toBe(true)
  })

  it('valida os ranges do ícone', () => {
    const icon = {
      id: 'icon-1',
      kind: 'icon' as const,
      svgIcon: null,
      iconScale: 1,
      iconLineWidth: 0.3,
      offsetX: 0,
      offsetY: 0,
    }
    expect(iconContentSchema.safeParse(icon).success).toBe(true)
    expect(iconContentSchema.safeParse({ ...icon, iconScale: 0.4 }).success).toBe(false)
    expect(iconContentSchema.safeParse({ ...icon, iconLineWidth: 2 }).success).toBe(false)
    expect(iconContentSchema.safeParse({ ...icon, svgIcon: '' }).success).toBe(false)
  })

  it('valida os ranges da peça', () => {
    const valid = defaultPhotoStandParams
    expect(photoStandParamsSchema.safeParse({ ...valid, sideMargin: 2.9 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, bandHeight: 41 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, depth: 29 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, thickness: 1.9 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, angle: 59 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, angle: 86 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, productType: 'card' }).success).toBe(false)
  })

  it('mantém as 10 cores PLA', () => {
    expect(PLA_COLORS).toHaveLength(10)
    expect(PLA_COLORS).toContain(defaultPhotoStandParams.baseColor)
    expect(PLA_COLORS).toContain(defaultPhotoStandParams.letterColor)
  })

  it('remove acentos', () => {
    expect(normalizeName('Família Coração')).toBe('Familia Coracao')
  })

  it('sanitiza o nome do arquivo', () => {
    expect(sanitizeFilename('Suporte Família! @#')).toBe('Suporte-Familia')
    expect(sanitizeFilename('***')).toBe('suporte-foto')
  })
})
