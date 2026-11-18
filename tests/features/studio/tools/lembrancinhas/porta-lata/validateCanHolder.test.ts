import { describe, it, expect } from 'vitest'
import {
  GLYPH_HEIGHT_FACTOR,
  MIN_HANDLE_GAP_MM,
  TEXT_MARGIN_MM,
  validateCanHolder,
} from '@/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder'
import {
  defaultCanHolderParams,
  getEffectiveRimChamfer,
  getExposedHeight,
  getOuterHeight,
  type CanHolderGeometryParams,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'

function withParams(overrides: Partial<CanHolderGeometryParams>): CanHolderGeometryParams {
  return { ...defaultCanHolderParams, ...overrides }
}

describe('validateCanHolder', () => {
  it('não aponta problemas nos defaults', () => {
    expect(validateCanHolder(defaultCanHolderParams)).toHaveLength(0)

    // Sanidade das premissas do caso feliz.
    expect(getExposedHeight(defaultCanHolderParams)).toBeCloseTo(14.2, 5)
    expect(getOuterHeight(defaultCanHolderParams)).toBeCloseTo(111.2, 5)
    expect(defaultCanHolderParams.wallThickness - defaultCanHolderParams.rimChamfer - defaultCanHolderParams.rimLeadIn)
      .toBeCloseTo(1.0, 5)
  })

  it('aponta lata exposta abaixo de 6 mm e profundidade fora da faixa', () => {
    const deep = validateCanHolder(withParams({ cavityDepth: 118 }))
    expect(deep).toContainEqual(expect.objectContaining({ code: 'can-cavity', severity: 'error' }))
    expect(getExposedHeight(withParams({ cavityDepth: 118 }))).toBeCloseTo(4.2, 5)

    const outOfRange = validateCanHolder(withParams({ cavityDepth: 119 }))
    expect(outOfRange).toContainEqual(
      expect.objectContaining({ code: 'can-cavity', severity: 'error' }),
    )
  })

  it('aponta folga da lata fora da faixa (defensiva)', () => {
    const narrow = validateCanHolder(withParams({ canClearance: 0.4 }))
    expect(narrow).toContainEqual(
      expect.objectContaining({ code: 'can-clearance', severity: 'warning' }),
    )
    const loose = validateCanHolder(withParams({ canClearance: 1.3 }))
    expect(loose).toContainEqual(
      expect.objectContaining({ code: 'can-clearance', severity: 'warning' }),
    )
  })

  it('aponta furo de ventilação grande demais (defensivo, inalcançável pelo schema)', () => {
    // Schema limita o furo a 14 mm e a parede interna a ≥33,6 mm de raio, então
    // a regra só é alcançável com um objeto construído fora do schema.
    const issues = validateCanHolder(withParams({ ventHoleDiameter: 70 }))
    expect(issues).toContainEqual(expect.objectContaining({ code: 'can-vent', severity: 'error' }))
    expect(validateCanHolder(defaultCanHolderParams).some((issue) => issue.code === 'can-vent')).toBe(false)
  })

  it('aponta parede do topo abaixo de 0,8 mm antes do clamp do perfil', () => {
    const issues = validateCanHolder(withParams({ wallThickness: 1.8, rimLeadIn: 2 }))
    expect(issues).toContainEqual(expect.objectContaining({ code: 'can-rim', severity: 'error' }))
    // A parede em si está no mínimo do schema; só a borda crua é inviável.
    expect(issues.some((issue) => issue.code === 'can-wall')).toBe(false)
  })

  it('aponta parede e fundo defensivos', () => {
    const thin = validateCanHolder(
      withParams({ wallThickness: 1.7, rimLeadIn: 0.5, rimChamfer: 0 }),
    )
    expect(thin).toContainEqual(expect.objectContaining({ code: 'can-wall', severity: 'error' }))
    expect(thin.some((issue) => issue.code === 'can-rim')).toBe(false)

    const shallow = validateCanHolder(withParams({ bottomThickness: 1.5 }))
    expect(shallow).toContainEqual(expect.objectContaining({ code: 'can-bottom', severity: 'error' }))
  })

  it('aponta texto que pode não caber no arco', () => {
    const issues = validateCanHolder(
      withParams({ text: 'A'.repeat(20), textSize: 18 }),
    )
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'can-text-fit', severity: 'warning' }),
    )
  })

  it('aponta texto cruzando a borda', () => {
    const issues = validateCanHolder(
      withParams({ cavityDepth: 80, textCenterY: 90, textSize: 18 }),
    )
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'can-text-band', severity: 'error' }),
    )
  })

  it('aceita texto exatamente no limite superior da faixa', () => {
    const params = withParams({ cavityDepth: 90 })
    const halfHeight = (params.textSize * GLYPH_HEIGHT_FACTOR) / 2
    const ceiling =
      getOuterHeight(params) - getEffectiveRimChamfer(params) - TEXT_MARGIN_MM

    const issues = validateCanHolder({ ...params, textCenterY: ceiling - halfHeight })
    expect(issues.some((issue) => issue.code === 'can-text-band')).toBe(false)
  })

  it('não aponta problemas de texto quando o texto está vazio', () => {
    for (const text of ['', '   ']) {
      const issues = validateCanHolder(withParams({ text }))
      expect(issues.some((issue) => issue.code.startsWith('can-text'))).toBe(false)
    }
  })

  it('aponta abertura vertical desconfortável abaixo de 26 mm', () => {
    const narrow = validateCanHolder(withParams({ handleGap: MIN_HANDLE_GAP_MM - 2 }))
    expect(narrow).toContainEqual(
      expect.objectContaining({ code: 'can-handle-gap', severity: 'warning' }),
    )
    expect(
      validateCanHolder(defaultCanHolderParams).some(
        (issue) => issue.code === 'can-handle-gap',
      ),
    ).toBe(false)
  })

  it('aponta alcance insuficiente para a mão', () => {
    const small = validateCanHolder(withParams({ handleReach: 30, handleBand: 10 }))
    expect(small).toContainEqual(
      expect.objectContaining({ code: 'can-handle-reach', severity: 'warning' }),
    )
  })

  it('aponta folga acima da interferência da abraçadeira', () => {
    const atLimit = validateCanHolder(withParams({ handleClearance: 0.4 }))
    expect(atLimit.some((issue) => issue.code === 'can-handle-fit')).toBe(false)
    const loose = validateCanHolder(withParams({ handleClearance: 0.41 }))
    expect(loose).toContainEqual(
      expect.objectContaining({ code: 'can-handle-fit', severity: 'warning' }),
    )
  })

  it('aponta banda da alça fora da altura do corpo', () => {
    const high = validateCanHolder(withParams({ cavityDepth: 80, handleHeight: 80 }))
    expect(high).toContainEqual(
      expect.objectContaining({ code: 'can-handle-band', severity: 'error' }),
    )
    // A banda vai de 74 a 86 mm; o topo útil do corpo de 83,2 mm é 80,8 mm.
    expect(high.some((issue) => issue.code === 'can-cavity')).toBe(false)
    expect(validateCanHolder(defaultCanHolderParams).some((issue) => issue.code === 'can-handle-band')).toBe(false)
  })

  it('não aponta problemas de alça quando a alça está desligada', () => {
    const warningParams = withParams({
      cavityDepth: 80,
      handleGap: MIN_HANDLE_GAP_MM - 2,
      handleClearance: 0.41,
      handleReach: 30,
      handleBand: 10,
      text: 'A'.repeat(20),
      textSize: 18,
      textCenterY: 90,
    })

    // Os mesmos parâmetros ligados emitem os três avisos de alça...
    const enabled = validateCanHolder({ ...warningParams, handleEnabled: true })
    expect(enabled).toContainEqual(
      expect.objectContaining({ code: 'can-handle-gap', severity: 'warning' }),
    )
    expect(enabled).toContainEqual(
      expect.objectContaining({ code: 'can-handle-reach', severity: 'warning' }),
    )
    expect(enabled).toContainEqual(
      expect.objectContaining({ code: 'can-handle-fit', severity: 'warning' }),
    )

    // ...e desligados não deixam nenhum código de alça, mas a faixa do texto
    // continua sendo verificada.
    const disabled = validateCanHolder({ ...warningParams, handleEnabled: false })
    expect(disabled.some((issue) => issue.code.startsWith('can-handle'))).toBe(false)
    expect(disabled).toContainEqual(
      expect.objectContaining({ code: 'can-text-band', severity: 'error' }),
    )
  })
})
