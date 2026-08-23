import {
  clampParameter,
  defaultParameters,
  modelParametersSchema,
  parameterDefinitions,
} from '@/features/studio/config/parameters'

describe('parameters config', () => {
  it('defaults são válidos conforme o schema', () => {
    expect(modelParametersSchema.parse(defaultParameters)).toEqual(defaultParameters)
  })

  it('define 5 parâmetros com label, min, max, step e unit', () => {
    expect(parameterDefinitions).toHaveLength(5)
    for (const def of parameterDefinitions) {
      expect(def.label.trim()).not.toBe('')
      expect(def.min).toBeLessThan(def.max)
      expect(def.step).toBeGreaterThan(0)
      expect(def.unit).toBe('mm')
    }
  })

  it('clampParameter limita valores ao range do parâmetro', () => {
    expect(clampParameter('width', 5)).toBe(10)
    expect(clampParameter('width', 200)).toBe(100)
    expect(clampParameter('width', 55)).toBe(55)
    expect(clampParameter('radius', -3)).toBe(0)
    expect(clampParameter('segments', 99)).toBe(32)
  })

  it('clampParameter arredonda para o step inteiro', () => {
    expect(clampParameter('width', 55.7)).toBe(56)
    expect(clampParameter('radius', 3.4)).toBe(3)
  })

  it('schema rejeita valores fora do range', () => {
    expect(
      modelParametersSchema.safeParse({ ...defaultParameters, width: 5 }).success,
    ).toBe(false)
    expect(
      modelParametersSchema.safeParse({ ...defaultParameters, segments: 2.5 }).success,
    ).toBe(false)
  })
})
