import {
  defaultKeychainParams,
  keychainParamsSchema,
  normalizeName,
  sanitizeFilename,
  TEXT_BORDER_MIN,
  RING_EDGE_MARGIN,
} from '@/features/studio/keychain/schema'

describe('keychain schema', () => {
  it('defaults são válidos', () => {
    expect(keychainParamsSchema.parse(defaultKeychainParams)).toEqual(defaultKeychainParams)
  })

  it('aceita formas, modos, fontes, posições de argola e cores válidas', () => {
    for (const baseShape of ['rect', 'circle', 'heart'] as const) {
      for (const fontStyle of ['normal', 'bold', 'serif'] as const) {
        for (const ringPosition of ['top', 'bottom', 'left', 'right'] as const) {
          const parsed = keychainParamsSchema.safeParse({
            ...defaultKeychainParams,
            baseShape,
            fontStyle,
            ringPosition,
          })
          expect(parsed.success).toBe(true)
        }
      }
    }
  })

  it('rejeita nome vazio ou maior que 12 chars', () => {
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, name: '' }).success).toBe(false)
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, name: 'a'.repeat(13) }).success).toBe(false)
  })

  it('rejeita borda externa menor que 4mm', () => {
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, borderWidth: 3.9 }).success).toBe(false)
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, borderWidth: 4 }).success).toBe(true)
  })

  it('rejeita ajuste radial negativo e encaixe fora do range', () => {
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, ringRadialOffset: -1 }).success).toBe(false)
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, ringEmbedding: 4 }).success).toBe(false)
  })

  it('rejeita valores fora dos ranges numéricos', () => {
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, width: 10 }).success).toBe(false)
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, thickness: 8 }).success).toBe(false)
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, ringInnerDiameter: 2 }).success).toBe(false)
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, ringLateralOffset: 15 }).success).toBe(false)
  })

  it('rejeita cores fora da paleta PLA', () => {
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, baseColor: '#ff0000' }).success).toBe(false)
  })

  it('exporta constantes de segurança', () => {
    expect(TEXT_BORDER_MIN).toBe(4)
    expect(RING_EDGE_MARGIN).toBe(2)
  })

  it('normalizeName remove acentos e ç', () => {
    expect(normalizeName('João Çaça')).toBe('Joao Caca')
  })

  it('sanitizeFilename gera nome de arquivo seguro', () => {
    expect(sanitizeFilename('Meu Projeto! @#')).toBe('Meu-Projeto')
    expect(sanitizeFilename('///')).toBe('chaveiro')
  })
})
