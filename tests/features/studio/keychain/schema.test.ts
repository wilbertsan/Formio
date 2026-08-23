import {
  defaultKeychainParams,
  keychainParamsSchema,
  normalizeName,
  sanitizeFilename,
} from '@/features/studio/keychain/schema'

describe('keychain schema', () => {
  it('defaults são válidos', () => {
    expect(keychainParamsSchema.parse(defaultKeychainParams)).toEqual(defaultKeychainParams)
  })

  it('aceita os três formatos e dois modos de texto', () => {
    for (const shape of ['rect', 'circle', 'heart'] as const) {
      for (const textMode of ['raised', 'engraved'] as const) {
        expect(
          keychainParamsSchema.safeParse({ ...defaultKeychainParams, shape, textMode }).success,
        ).toBe(true)
      }
    }
  })

  it('rejeita nome vazio ou maior que 12 chars', () => {
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, name: '' }).success,
    ).toBe(false)
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, name: 'a'.repeat(13) }).success,
    ).toBe(false)
  })

  it('rejeita valores fora dos ranges', () => {
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, width: 10 }).success,
    ).toBe(false)
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, thickness: 8 }).success,
    ).toBe(false)
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, holeDiameter: 2 }).success,
    ).toBe(false)
  })

  it('normalizeName remove acentos e ç', () => {
    expect(normalizeName('João Çaça')).toBe('Joao Caca')
    expect(normalizeName('Ana')).toBe('Ana')
  })

  it('sanitizeFilename gera nome de arquivo seguro', () => {
    expect(sanitizeFilename('Meu Projeto! @#')).toBe('Meu-Projeto')
    expect(sanitizeFilename('///')).toBe('chaveiro')
  })
})
