import { describe, it, expect } from 'vitest'
import {
  GLYPH_HEIGHT_FACTOR,
  MIN_HANDLE_GAP_MM,
  TEXT_MARGIN_MM,
  validateMug,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/validateMug'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { getEffectiveRimChamfer } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/shapes'

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

  it('aceita topo e base com o mesmo diâmetro', () => {
    const issues = validateMug({
      ...defaultMugParams,
      diameterTop: 80,
      diameterBottom: 80,
    })
    expect(issues.some((issue) => issue.code === 'mug-taper')).toBe(false)
  })

  it('aponta texto que pode não caber no arco', () => {
    const issues = validateMug({
      ...defaultMugParams,
      text: 'A'.repeat(20),
      textSize: 18,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-text-fit', severity: 'warning' }))
  })

  it('aponta texto cruzando a borda', () => {
    const issues = validateMug({ ...defaultMugParams, textCenterY: 88 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-text-band', severity: 'error' }))
  })

  it('aceita texto exatamente no limite superior da faixa', () => {
    const halfHeight = (defaultMugParams.textSize * GLYPH_HEIGHT_FACTOR) / 2
    const ceiling =
      defaultMugParams.height - getEffectiveRimChamfer(defaultMugParams) - TEXT_MARGIN_MM
    const issues = validateMug({
      ...defaultMugParams,
      textCenterY: ceiling - halfHeight,
    })
    expect(issues.some((issue) => issue.code === 'mug-text-band')).toBe(false)
  })

  it('não aponta problemas de texto quando o texto está vazio', () => {
    for (const text of ['', '   ']) {
      const issues = validateMug({ ...defaultMugParams, text })
      expect(issues.some((issue) => issue.code.startsWith('mug-text'))).toBe(false)
    }
  })

  it('aponta abraçadeira fora do corpo e abertura pequena', () => {
    const high = validateMug({ ...defaultMugParams, handleHeight: 84 })
    expect(high).toContainEqual(expect.objectContaining({ code: 'mug-handle-band', severity: 'error' }))
    const small = validateMug({ ...defaultMugParams, handleReach: 30, handleBand: 10 })
    expect(small).toContainEqual(expect.objectContaining({ code: 'mug-handle-reach', severity: 'warning' }))
  })

  it('aponta abertura vertical desconfortável abaixo de 26 mm', () => {
    const narrow = validateMug({ ...defaultMugParams, handleGap: MIN_HANDLE_GAP_MM - 2 })
    expect(narrow).toContainEqual(expect.objectContaining({ code: 'mug-handle-gap', severity: 'warning' }))
    expect(validateMug(defaultMugParams).some((issue) => issue.code === 'mug-handle-gap')).toBe(false)
  })

  it('aponta folga acima da interferência e capacidade fora da faixa', () => {
    const atLimit = validateMug({ ...defaultMugParams, handleClearance: 0.4 })
    expect(atLimit.some((issue) => issue.code === 'mug-handle-fit')).toBe(false)
    const loose = validateMug({ ...defaultMugParams, handleClearance: 0.41 })
    expect(loose).toContainEqual(expect.objectContaining({ code: 'mug-handle-fit', severity: 'warning' }))

    const big = validateMug({
      ...defaultMugParams,
      diameterTop: 100,
      diameterBottom: 95,
      height: 115,
      wallThickness: 1.8,
      bottomThickness: 2,
    })
    expect(big).toContainEqual(expect.objectContaining({ code: 'mug-capacity', severity: 'warning' }))
  })

  it('aponta parede e fundo defensivos', () => {
    const thin = validateMug({ ...defaultMugParams, wallThickness: 1.7 })
    expect(thin).toContainEqual(expect.objectContaining({ code: 'mug-wall', severity: 'error' }))
    const shallow = validateMug({ ...defaultMugParams, bottomThickness: 1.5 })
    expect(shallow).toContainEqual(expect.objectContaining({ code: 'mug-bottom', severity: 'error' }))
  })

  it('não aponta problemas de alça quando a alça está desligada', () => {
    const warningParams = {
      ...defaultMugParams,
      handleGap: MIN_HANDLE_GAP_MM - 2,
      handleClearance: 0.41,
      handleReach: 30,
      handleBand: 10,
      text: 'A'.repeat(20),
      textSize: 8,
      textCenterY: 88,
    }

    // Os mesmos parâmetros ligados emitem os três avisos de alça...
    const enabled = validateMug({ ...warningParams, handleEnabled: true })
    expect(enabled).toContainEqual(expect.objectContaining({ code: 'mug-handle-gap', severity: 'warning' }))
    expect(enabled).toContainEqual(expect.objectContaining({ code: 'mug-handle-reach', severity: 'warning' }))
    expect(enabled).toContainEqual(expect.objectContaining({ code: 'mug-handle-fit', severity: 'warning' }))

    // ...e desligados não deixam nenhum código de alça, mas a faixa do texto
    // continua sendo verificada.
    const disabled = validateMug({ ...warningParams, handleEnabled: false })
    expect(disabled.some((issue) => issue.code.startsWith('mug-handle'))).toBe(false)
    expect(disabled).toContainEqual(expect.objectContaining({ code: 'mug-text-band', severity: 'error' }))
  })
})
