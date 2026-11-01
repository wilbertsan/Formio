import {
  contentItemSchema,
  defaultKeychainParams,
  keychainParamsSchema,
  normalizeName,
  sanitizeFilename,
  TEXT_BORDER_MIN,
  RING_EDGE_MARGIN,
} from '@/features/studio/tools/chaveiros/chaveiro/schema'

describe('keychain schema', () => {
  it('schema não inclui campos globais de texto removidos', () => {
    expect('name' in keychainParamsSchema.shape).toBe(false)
    expect('fontStyle' in keychainParamsSchema.shape).toBe(false)
    expect('letterHeight' in keychainParamsSchema.shape).toBe(false)
    expect('textWidth' in keychainParamsSchema.shape).toBe(false)
    expect('textSize' in keychainParamsSchema.shape).toBe(false)
  })

  it('schema inclui height com range 20-80', () => {
    expect(keychainParamsSchema.shape.height).toBeDefined()
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, height: 19 }).success).toBe(false)
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, height: 81 }).success).toBe(false)
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, height: 50 }).success).toBe(true)
  })

  it('exporta constantes de segurança', () => {
    expect(TEXT_BORDER_MIN).toBe(4)
    expect(RING_EDGE_MARGIN).toBe(2)
  })

  it('normalizeName remove acentos e ç', () => {
    expect(normalizeName('João Çaça')).toBe('Joao Caca')
  })

  it('sanitizeFilename gera nome seguro', () => {
    expect(sanitizeFilename('Meu Projeto! @#')).toBe('Meu-Projeto')
    expect(sanitizeFilename('///')).toBe('chaveiro')
  })

  it('baseShape aceita formato name', () => {
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, baseShape: 'name' }).success).toBe(true)
  })
})

describe('conteúdo texto/ícone', () => {
  it('aceita texto com fontSize 6-15', () => {
    const text = {
      id: 't1', kind: 'text', content: 'Ana', fontStyle: 'bold',
      fontSize: 10, offsetX: 0, offsetY: 0,
    }
    expect(contentItemSchema.parse(text)).toEqual(text)
    expect(contentItemSchema.safeParse({ ...text, fontSize: 5 }).success).toBe(false)
    expect(contentItemSchema.safeParse({ ...text, fontSize: 16 }).success).toBe(false)
  })

  it('aceita ícone sem SVG (upload pendente)', () => {
    const icon = {
      id: 'i1', kind: 'icon', svgIcon: null, iconScale: 1,
      iconLineWidth: 0.3, offsetX: 0, offsetY: 0,
    }
    expect(contentItemSchema.parse(icon)).toEqual(icon)
  })

  it('defaults são válidos e incluem reliefDepth', () => {
    expect(keychainParamsSchema.parse(defaultKeychainParams)).toEqual(defaultKeychainParams)
    expect(defaultKeychainParams.reliefDepth).toBe(1)
    expect(defaultKeychainParams.contents).toHaveLength(1)
  })

  it('aceita 1-3 conteúdos e rejeita 0/4', () => {
    for (const count of [1, 2, 3]) {
      const contents = Array.from({ length: count }, (_, i) => ({
        ...defaultKeychainParams.contents[0], id: `c${i}`,
      }))
      expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, contents }).success).toBe(true)
    }
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, contents: [] }).success).toBe(false)
    const four = Array.from({ length: 4 }, (_, i) => ({
      ...defaultKeychainParams.contents[0], id: `c${i}`,
    }))
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, contents: four }).success).toBe(false)
  })
})
