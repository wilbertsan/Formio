import {
  defaultKeychainParams,
  keychainParamsSchema,
  normalizeName,
  sanitizeFilename,
  textItemSchema,
  TEXT_BORDER_MIN,
  RING_EDGE_MARGIN,
} from '@/features/studio/keychain/schema'

describe('keychain schema', () => {
  it('defaults são válidos', () => {
    expect(keychainParamsSchema.parse(defaultKeychainParams)).toEqual(defaultKeychainParams)
  })

  it('aceita 1, 2 e 3 textos', () => {
    for (const count of [1, 2, 3]) {
      const texts = Array.from({ length: count }, (_, i) => ({
        ...defaultKeychainParams.texts[0],
        id: `t${i}`,
      }))
      expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, texts }).success).toBe(true)
    }
  })

  it('rejeita 0 textos e 4 textos', () => {
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, texts: [] }).success).toBe(false)
    const four = Array.from({ length: 4 }, (_, i) => ({ ...defaultKeychainParams.texts[0], id: `t${i}` }))
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, texts: four }).success).toBe(false)
  })

  it('textItemSchema valida ranges corretamente', () => {
    const valid = defaultKeychainParams.texts[0]
    expect(textItemSchema.parse(valid)).toEqual(valid)
    expect(textItemSchema.safeParse({ ...valid, content: '' }).success).toBe(false)
    expect(textItemSchema.safeParse({ ...valid, width: 3 }).success).toBe(false)
    expect(textItemSchema.safeParse({ ...valid, height: 25 }).success).toBe(false)
    expect(textItemSchema.safeParse({ ...valid, offsetX: 25 }).success).toBe(false)
  })

  it('schema não inclui campos globais de texto removidos', () => {
    expect('name' in keychainParamsSchema.shape).toBe(false)
    expect('fontStyle' in keychainParamsSchema.shape).toBe(false)
    expect('letterHeight' in keychainParamsSchema.shape).toBe(false)
    expect('textWidth' in keychainParamsSchema.shape).toBe(false)
    expect('textSize' in keychainParamsSchema.shape).toBe(false)
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
})
