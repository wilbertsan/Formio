import { describe, it, expect } from 'vitest'
import {
  GLYPH_HEIGHT_FACTOR,
  MIN_HANDLE_GAP_MM,
  validateCanHolder,
} from '@/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder'
import {
  TEXT_BAND_MARGIN_MM,
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
    // Objeto direto, fora do schema (máx. 116): a regra defensiva continua
    // valendo para chamadas internas que não passam pelo Zod.
    const deep = validateCanHolder(withParams({ cavityDepth: 118 }))
    expect(deep).toContainEqual(expect.objectContaining({ code: 'can-cavity', severity: 'error' }))
    expect(getExposedHeight(withParams({ cavityDepth: 118 }))).toBeCloseTo(4.2, 5)

    const outOfRange = validateCanHolder(withParams({ cavityDepth: 119 }))
    expect(outOfRange).toContainEqual(
      expect.objectContaining({ code: 'can-cavity', severity: 'error' }),
    )
    expect(
      validateCanHolder(withParams({ cavityDepth: 116 })).some(
        (issue) => issue.code === 'can-cavity',
      ),
    ).toBe(false)
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

  it('aponta salto grande demais para a largura da borda (defensivo)', () => {
    // Fora do schema (largura < 4): 2 × 1,5 + 1 mm de face plana não cabem em
    // 3 mm. O clamp do perfil reduziria o salto, mas a regra é crua.
    const issues = validateCanHolder(withParams({ edgeRimWidth: 3, edgeRimProtrusion: 1.5 }))
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'can-edge-rim', severity: 'error' }),
    )
    expect(
      validateCanHolder(defaultCanHolderParams).some((issue) => issue.code === 'can-edge-rim'),
    ).toBe(false)
    // Fronteira do schema: 2 × 1,5 + 1 mm cabem exatamente nos 4 mm.
    expect(
      validateCanHolder(withParams({ edgeRimWidth: 4, edgeRimProtrusion: 1.5 })).some(
        (issue) => issue.code === 'can-edge-rim',
      ),
    ).toBe(false)
  })

  it('aponta bordas que ocupam a altura toda do corpo (defensivo)', () => {
    // Dois anéis de 60 mm mais 2 mm livres em cada ponta passam dos 111,2 mm.
    const issues = validateCanHolder(withParams({ edgeRimWidth: 60 }))
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'can-edge-rim', severity: 'error' }),
    )
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
      getOuterHeight(params) -
      Math.max(getEffectiveRimChamfer(params), params.edgeRimWidth) -
      TEXT_BAND_MARGIN_MM

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

  it('aceita o laço em D acima da borda quando a banda fica no corpo', () => {
    // Vão completo do laço: 85 ± (40 / 2 + 10) → 55 a 115 mm, acima dos
    // 111,2 mm do corpo. Só a banda (85 ± 6 → 79 a 91 mm) precisa caber.
    const params = withParams({ handleHeight: 85, handleGap: 40, handleBand: 10 })
    expect(params.handleHeight + params.handleGap / 2 + params.handleBand).toBeGreaterThan(
      getOuterHeight(params),
    )
    expect(validateCanHolder(params).some((issue) => issue.code === 'can-handle-band')).toBe(false)
  })

  it('aceita a banda exatamente no limite superior do corpo', () => {
    // Anéis desligados: o teste é sobre o chanfro. Corpo de 95 mm + chanfro 0
    // → topo útil 93 mm; banda 85 ± 8 → 93 mm.
    const params = withParams({
      cavityDepth: 91.8,
      bottomThickness: 3.2,
      rimChamfer: 0,
      edgeRimEnabled: false,
      handleHeight: 85,
      handleWidth: 16,
    })
    expect(getOuterHeight(params)).toBeCloseTo(95, 10)
    expect(getEffectiveRimChamfer(params)).toBe(0)
    expect(params.handleHeight + params.handleWidth / 2).toBe(
      getOuterHeight(params) - getEffectiveRimChamfer(params) - 2,
    )

    const issues = validateCanHolder(params)
    expect(issues.some((issue) => issue.code === 'can-handle-band')).toBe(false)
  })

  it('mantém a banda da alça entre os anéis', () => {
    // Corpo de 103,2 mm com anéis de 14 mm: a banda (85 ± 8 → 77 a 93 mm)
    // passa do topo útil de 87,2 mm.
    const params = withParams({
      cavityDepth: 100,
      edgeRimWidth: 14,
      handleHeight: 85,
      handleWidth: 16,
    })
    const issues = validateCanHolder(params)
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'can-handle-band', severity: 'error' }),
    )
    expect(issues.some((issue) => issue.code === 'can-cavity')).toBe(false)
    expect(
      validateCanHolder({ ...params, edgeRimEnabled: false }).some(
        (issue) => issue.code === 'can-handle-band',
      ),
    ).toBe(false)
  })

  it('mantém o texto entre os anéis', () => {
    // Corpo de 103,2 mm com anéis de 6 mm: o topo útil é 95,2 mm e o texto de
    // 18 mm centrado em 90 mm chega a 99,9 mm.
    const high = withParams({ cavityDepth: 100, textCenterY: 90, textSize: 18 })
    expect(validateCanHolder(high)).toContainEqual(
      expect.objectContaining({ code: 'can-text-band', severity: 'error' }),
    )
    expect(
      validateCanHolder({ ...high, edgeRimEnabled: false }).some(
        (issue) => issue.code === 'can-text-band',
      ),
    ).toBe(false)

    // Anéis de 14 mm sobem o piso para 16 mm; o texto centrado em 20 mm chega
    // a 10,1 mm.
    const low = withParams({ textCenterY: 20, textSize: 18, edgeRimWidth: 14 })
    expect(validateCanHolder(low)).toContainEqual(
      expect.objectContaining({ code: 'can-text-band', severity: 'error' }),
    )
    expect(
      validateCanHolder({ ...low, edgeRimEnabled: false }).some(
        (issue) => issue.code === 'can-text-band',
      ),
    ).toBe(false)
  })

  it('aceita os limites exatos de cavidade, folga, borda, fundo, texto e alça', () => {
    // Lata exposta exatamente em 6 mm.
    const exposed = withParams({ cavityDepth: 116.2 })
    expect(getExposedHeight(exposed)).toBe(6)
    expect(validateCanHolder(exposed).some((issue) => issue.code === 'can-cavity')).toBe(false)

    // Folga nos dois extremos do schema.
    for (const canClearance of [0.5, 1.2]) {
      const issues = validateCanHolder(withParams({ canClearance }))
      expect(issues.some((issue) => issue.code === 'can-clearance')).toBe(false)
    }

    // Parede do topo exatamente em 0,8 mm; o épsilon cobre o arredondamento.
    const rim = withParams({ rimChamfer: 0.6, rimLeadIn: 1.0 })
    expect(rim.wallThickness - rim.rimChamfer - rim.rimLeadIn).toBeCloseTo(0.8, 12)
    expect(validateCanHolder(rim).some((issue) => issue.code === 'can-rim')).toBe(false)

    // Fundo exatamente em 2 mm e faixa de texto no limite inferior. O centro
    // fica abaixo do mínimo do schema: é um caso de regra, não de UI.
    const bottom = withParams({ bottomThickness: 2 })
    expect(validateCanHolder(bottom).some((issue) => issue.code === 'can-bottom')).toBe(false)
    const halfHeight = (bottom.textSize * GLYPH_HEIGHT_FACTOR) / 2
    const floor = Math.max(bottom.bottomThickness, bottom.edgeRimWidth) + TEXT_BAND_MARGIN_MM
    const lowerBand = validateCanHolder({ ...bottom, textCenterY: floor + halfHeight })
    expect(lowerBand.some((issue) => issue.code === 'can-text-band')).toBe(false)

    // Abertura vertical da mão exatamente em 26 mm.
    expect(
      validateCanHolder(withParams({ handleGap: MIN_HANDLE_GAP_MM })).some(
        (issue) => issue.code === 'can-handle-gap',
      ),
    ).toBe(false)
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

  it('avisa quando a profundidade da textura é limitada pela escala', () => {
    const clamped = withParams({ textureStyle: 'wood', textureDepth: 1.5, textureScale: 4 })
    expect(validateCanHolder(clamped)).toContainEqual(
      expect.objectContaining({ code: 'can-texture', severity: 'warning' }),
    )
    expect(validateCanHolder(defaultCanHolderParams).some((issue) => issue.code === 'can-texture')).toBe(false)
    const boundary = withParams({ textureStyle: 'wood', textureDepth: 1, textureScale: 4 })
    expect(validateCanHolder(boundary).some((issue) => issue.code === 'can-texture')).toBe(false)
  })

  it('não aplica o limite de escala aos importados', () => {
    const imported = withParams({ textureStyle: 'paralelepipedos', textureDepth: 1.5, textureScale: 4 })
    expect(
      validateCanHolder(imported).some((issue) => issue.code === 'can-texture'),
    ).toBe(false)
  })

  it('avisa a abertura da mão com textura profunda e alcance curto', () => {
    const imported = withParams({
      textureStyle: 'pedra_hexagonal',
      handleReach: 30,
      handleBand: 10,
    })
    expect(
      validateCanHolder(imported).some((issue) => issue.code === 'can-handle-reach'),
    ).toBe(true)
  })

  it('não inventa avisos novos para importados nos defaults', () => {
    const imported = withParams({ textureStyle: 'tijolos_limpos' })
    expect(validateCanHolder(imported)).toHaveLength(0)
  })
})
