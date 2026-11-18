import { describe, it, expect } from 'vitest'
import {
  GLYPH_HEIGHT_FACTOR,
  MIN_HANDLE_GAP_MM,
  TEXT_MARGIN_MM,
  validateCanHolder,
} from '@/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder'
import { defaultCanHolderParams } from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { getEffectiveRimChamfer } from '@/features/studio/tools/lembrancinhas/porta-lata/shapes'

describe('validateCanHolder', () => {
  it('não aponta problemas nos defaults', () => {
    expect(validateCanHolder(defaultCanHolderParams)).toHaveLength(0)
  })

  it('aponta corpo mais estreito no topo', () => {
    const issues = validateCanHolder({
      ...defaultCanHolderParams,
      diameterTop: 70,
      diameterBottom: 95,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-taper', severity: 'error' }))
  })

  it('aceita topo e base com o mesmo diâmetro', () => {
    const issues = validateCanHolder({
      ...defaultCanHolderParams,
      diameterTop: 80,
      diameterBottom: 80,
    })
    expect(issues.some((issue) => issue.code === 'mug-taper')).toBe(false)
  })

  it('aponta texto que pode não caber no arco', () => {
    const issues = validateCanHolder({
      ...defaultCanHolderParams,
      text: 'A'.repeat(20),
      textSize: 18,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-text-fit', severity: 'warning' }))
  })

  it('aponta texto cruzando a borda', () => {
    const issues = validateCanHolder({ ...defaultCanHolderParams, textCenterY: 88 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-text-band', severity: 'error' }))
  })

  it('aceita texto exatamente no limite superior da faixa', () => {
    const halfHeight = (defaultCanHolderParams.textSize * GLYPH_HEIGHT_FACTOR) / 2
    const ceiling =
      defaultCanHolderParams.height - getEffectiveRimChamfer(defaultCanHolderParams) - TEXT_MARGIN_MM
    const issues = validateCanHolder({
      ...defaultCanHolderParams,
      textCenterY: ceiling - halfHeight,
    })
    expect(issues.some((issue) => issue.code === 'mug-text-band')).toBe(false)
  })

  it('não aponta problemas de texto quando o texto está vazio', () => {
    for (const text of ['', '   ']) {
      const issues = validateCanHolder({ ...defaultCanHolderParams, text })
      expect(issues.some((issue) => issue.code.startsWith('mug-text'))).toBe(false)
    }
  })

  it('aponta abraçadeira fora do corpo e abertura pequena', () => {
    const high = validateCanHolder({ ...defaultCanHolderParams, handleHeight: 84 })
    expect(high).toContainEqual(expect.objectContaining({ code: 'mug-handle-band', severity: 'error' }))
    const small = validateCanHolder({ ...defaultCanHolderParams, handleReach: 30, handleBand: 10 })
    expect(small).toContainEqual(expect.objectContaining({ code: 'mug-handle-reach', severity: 'warning' }))
  })

  it('aponta abertura vertical desconfortável abaixo de 26 mm', () => {
    const narrow = validateCanHolder({ ...defaultCanHolderParams, handleGap: MIN_HANDLE_GAP_MM - 2 })
    expect(narrow).toContainEqual(expect.objectContaining({ code: 'mug-handle-gap', severity: 'warning' }))
    expect(validateCanHolder(defaultCanHolderParams).some((issue) => issue.code === 'mug-handle-gap')).toBe(false)
  })

  it('aponta folga acima da interferência e capacidade fora da faixa', () => {
    const atLimit = validateCanHolder({ ...defaultCanHolderParams, handleClearance: 0.4 })
    expect(atLimit.some((issue) => issue.code === 'mug-handle-fit')).toBe(false)
    const loose = validateCanHolder({ ...defaultCanHolderParams, handleClearance: 0.41 })
    expect(loose).toContainEqual(expect.objectContaining({ code: 'mug-handle-fit', severity: 'warning' }))

    const big = validateCanHolder({
      ...defaultCanHolderParams,
      diameterTop: 100,
      diameterBottom: 95,
      height: 115,
      wallThickness: 1.8,
      bottomThickness: 2,
    })
    expect(big).toContainEqual(expect.objectContaining({ code: 'mug-capacity', severity: 'warning' }))
  })

  it('aponta parede e fundo defensivos', () => {
    const thin = validateCanHolder({ ...defaultCanHolderParams, wallThickness: 1.7 })
    expect(thin).toContainEqual(expect.objectContaining({ code: 'mug-wall', severity: 'error' }))
    const shallow = validateCanHolder({ ...defaultCanHolderParams, bottomThickness: 1.5 })
    expect(shallow).toContainEqual(expect.objectContaining({ code: 'mug-bottom', severity: 'error' }))
  })

  it('não aponta problemas de alça quando a alça está desligada', () => {
    const warningParams = {
      ...defaultCanHolderParams,
      handleGap: MIN_HANDLE_GAP_MM - 2,
      handleClearance: 0.41,
      handleReach: 30,
      handleBand: 10,
      text: 'A'.repeat(20),
      textSize: 8,
      textCenterY: 88,
    }

    // Os mesmos parâmetros ligados emitem os três avisos de alça...
    const enabled = validateCanHolder({ ...warningParams, handleEnabled: true })
    expect(enabled).toContainEqual(expect.objectContaining({ code: 'mug-handle-gap', severity: 'warning' }))
    expect(enabled).toContainEqual(expect.objectContaining({ code: 'mug-handle-reach', severity: 'warning' }))
    expect(enabled).toContainEqual(expect.objectContaining({ code: 'mug-handle-fit', severity: 'warning' }))

    // ...e desligados não deixam nenhum código de alça, mas a faixa do texto
    // continua sendo verificada.
    const disabled = validateCanHolder({ ...warningParams, handleEnabled: false })
    expect(disabled.some((issue) => issue.code.startsWith('mug-handle'))).toBe(false)
    expect(disabled).toContainEqual(expect.objectContaining({ code: 'mug-text-band', severity: 'error' }))
  })
})
