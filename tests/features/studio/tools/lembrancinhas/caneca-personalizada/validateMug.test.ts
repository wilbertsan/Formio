import { describe, it, expect } from 'vitest'
import { validateMug } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/validateMug'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'

describe('validateMug', () => {
  it('não aponta problemas nos defaults', () => {
    expect(validateMug(defaultMugParams)).toHaveLength(0)
  })

  it('aponta corpo mais estreito no topo', () => {
    const issues = validateMug({
      ...defaultMugParams,
      diameterTop: 70,
      diameterBottom: 95,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-taper', severity: 'error' }))
  })

  it('aponta texto que não cabe no arco', () => {
    const issues = validateMug({
      ...defaultMugParams,
      text: 'A'.repeat(20),
      textSize: 18,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-text-fit' }))
  })

  it('aponta texto cruzando a borda', () => {
    const issues = validateMug({ ...defaultMugParams, textCenterY: 88 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-text-band', severity: 'error' }))
  })

  it('aponta abraçadeira fora do corpo e abertura pequena', () => {
    const high = validateMug({ ...defaultMugParams, handleHeight: 84 })
    expect(high).toContainEqual(expect.objectContaining({ code: 'mug-handle-band' }))
    const small = validateMug({ ...defaultMugParams, handleReach: 30, handleBand: 10 })
    expect(small).toContainEqual(expect.objectContaining({ code: 'mug-handle-reach', severity: 'warning' }))
  })

  it('aponta folga alta e capacidade fora da faixa', () => {
    const loose = validateMug({ ...defaultMugParams, handleClearance: 0.5 })
    expect(loose).toContainEqual(expect.objectContaining({ code: 'mug-handle-fit', severity: 'warning' }))
    const big = validateMug({
      ...defaultMugParams,
      diameterTop: 100,
      diameterBottom: 95,
      height: 115,
      wallThickness: 1.8,
      bottomThickness: 2,
    })
    expect(big).toContainEqual(expect.objectContaining({ code: 'mug-capacity' }))
  })

  it('aponta parede e fundo defensivos', () => {
    const thin = validateMug({ ...defaultMugParams, wallThickness: 1.7 })
    expect(thin).toContainEqual(expect.objectContaining({ code: 'mug-wall', severity: 'error' }))
    const shallow = validateMug({ ...defaultMugParams, bottomThickness: 1.5 })
    expect(shallow).toContainEqual(expect.objectContaining({ code: 'mug-bottom', severity: 'error' }))
  })

  it('não aponta problemas de texto ou alça quando a alça está desligada', () => {
    const issues = validateMug({
      ...defaultMugParams,
      handleEnabled: false,
      textCenterY: 88,
    })
    expect(issues.some((issue) => issue.code.startsWith('mug-handle'))).toBe(false)
    expect(issues.some((issue) => issue.code === 'mug-text-band')).toBe(true)
  })
})
