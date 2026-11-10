import { describe, it, expect, vi } from 'vitest'
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  type BufferGeometry,
} from 'three'
import { Font, type FontData } from 'three/examples/jsm/loaders/FontLoader.js'
import {
  buildCakeTopper,
  disposeCakeTopperResult,
} from '@/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper'
import {
  defaultCakeTopperParams,
  defaultText,
  type TextItem,
} from '@/features/studio/tools/confeitaria/topo-bolo/schema'

const SVG_RECT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'
const SVG_EMPTY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"></svg>'
// Trapézio: topo (y=0) estreito (largura 40), base (y=100) larga (largura 100).
const SVG_TRAPEZOID = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M30,0 L70,0 L100,100 L0,100 Z" fill="#000"/></svg>'
// Triângulo retângulo: base (SVG y=100) reduzida a um único ponto em x=0 (esquerda).
const SVG_TRIANGLE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0,0 L100,0 L0,100 Z" fill="#000"/></svg>'
const SVG_DISCONNECTED = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0,0 L30,0 L30,100 L0,100 Z M70,0 L100,0 L100,100 L70,100 Z" fill="#000"/></svg>'
const SVG_NOTCH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0,0 L100,0 L100,100 L53,100 L53,80 L51,80 L51,100 L0,100 Z" fill="#000"/></svg>'
// Faixa estreita (8mm): cabe uma haste de 4mm, mas não um par separado.
const SVG_NARROW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="46" y="0" width="8" height="100" fill="#000"/></svg>'

function mockFont(text: string): Font {
  const glyphs: FontData['glyphs'] = {}
  for (const ch of text) {
    if (ch === ' ') continue
    glyphs[ch] = { ha: 600, x_min: 0, x_max: 600, o: 'm 0 0 l 600 0 l 600 100 l 0 100 z' }
  }
  const data: FontData = {
    glyphs,
    familyName: 'Mock',
    ascender: 800,
    descender: -200,
    underlinePosition: 0,
    underlineThickness: 0,
    boundingBox: { xMin: 0, xMax: 600, yMin: -200, yMax: 800 },
    resolution: 1000,
    original_font_information: {},
  }
  return new Font(data)
}

function text(overrides: Partial<TextItem>): TextItem {
  return { ...defaultText, ...overrides }
}

function bounds(geometry: BufferGeometry): { hw: number; hh: number; cx: number; cy: number } {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  return {
    hw: (box.max.x - box.min.x) / 2,
    hh: (box.max.y - box.min.y) / 2,
    cx: (box.min.x + box.max.x) / 2,
    cy: (box.min.y + box.max.y) / 2,
  }
}

// Intervalo em X dos vértices da geometria cujo Y cai em [fromY, toY].
function xIntervalInBand(geometry: BufferGeometry, fromY: number, toY: number): { min: number; max: number } | null {
  const pos = geometry.getAttribute('position')
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    if (y >= fromY && y <= toY) {
      const x = pos.getX(i)
      if (x < min) min = x
      if (x > max) max = x
    }
  }
  return Number.isFinite(min) ? { min, max } : null
}

function plateBottomAtX(
  plate: BufferGeometry,
  x: number,
  thickness: number,
): number | null {
  plate.computeBoundingBox()
  const bb = plate.boundingBox
  if (!bb) return null

  const material = new MeshBasicMaterial({ side: DoubleSide })
  const mesh = new Mesh(plate, material)
  const raycaster = new Raycaster(
    new Vector3(x, bb.max.y + 1, thickness / 2),
    new Vector3(0, -1, 0),
  )
  const hits = raycaster.intersectObject(mesh)
  material.dispose()
  if (hits.length === 0) return null
  return Math.min(...hits.map((hit) => hit.point.y))
}

describe('buildCakeTopper - placa', () => {
  it.each(['circle', 'rounded-rect', 'oval'] as const)('gera placa %s', (shape) => {
    const result = buildCakeTopper({ params: { ...defaultCakeTopperParams, shape } })
    expect(result.plate).toBeDefined()
    expect(result.plate.attributes.position).toBeDefined()
  })

  it('custom com SVG válido gera placa', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'custom' as const,
      contourSvg: SVG_RECT,
    }
    const result = buildCakeTopper({ params })
    expect(result.plate.attributes.position).toBeDefined()
  })

  it('custom sem contorno cai para círculo e sinaliza erro', () => {
    const onError = vi.fn()
    const params = {
      ...defaultCakeTopperParams,
      shape: 'custom' as const,
      contourSvg: null,
    }
    const result = buildCakeTopper({ params, onError })
    expect(result.plate.attributes.position).toBeDefined()
    expect(onError).toHaveBeenCalled()
  })

  it('custom com SVG sem formas cai para círculo e sinaliza erro', () => {
    const onError = vi.fn()
    const params = {
      ...defaultCakeTopperParams,
      shape: 'custom' as const,
      contourSvg: SVG_EMPTY,
    }
    const result = buildCakeTopper({ params, onError })
    expect(result.plate.attributes.position).toBeDefined()
    expect(onError).toHaveBeenCalled()
  })

  it('custom não fica de cabeça para baixo (Y do SVG é invertido)', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'custom' as const,
      contourSvg: SVG_TRAPEZOID,
      width: 100,
      height: 100,
    }
    const { plate } = buildCakeTopper({ params })
    plate.computeBoundingBox()
    const bb = plate.boundingBox!
    const eps = (bb.max.y - bb.min.y) * 0.1

    const bottom = xIntervalInBand(plate, bb.min.y, bb.min.y + eps)!
    const top = xIntervalInBand(plate, bb.max.y - eps, bb.max.y)!
    const bottomWidth = bottom.max - bottom.min
    const topWidth = top.max - top.min

    // No SVG a base (y=100) é larga e o topo (y=0) é estreito; no 3D o fundo
    // deve continuar sendo a parte larga.
    expect(bottomWidth).toBeGreaterThan(topWidth)
  })
})

describe('buildCakeTopper - relevo (raised)', () => {
  it('mescla múltiplos textos em relevo', () => {
    const params = {
      ...defaultCakeTopperParams,
      texts: [
        text({ id: 't1', content: 'A', offsetY: 10 }),
        text({ id: 't2', content: 'B', offsetY: -10 }),
      ],
    }
    const result = buildCakeTopper({ params, fonts: { bold: mockFont('AB') } })
    expect(result.relief).not.toBeNull()
    expect(result.relief!.attributes.position).toBeDefined()
  })

  it('sempre gera relevo sobre a placa, sem alterar a placa', () => {
    const relief = 2
    const params = {
      ...defaultCakeTopperParams,
      texts: [text({ content: 'A', width: 20, height: 10, relief })],
    }
    const plain = buildCakeTopper({ params: { ...params, texts: [] } })
    const result = buildCakeTopper({ params, fonts: { bold: mockFont('A') } })

    expect(result.relief).not.toBeNull()
    result.relief!.computeBoundingBox()
    const bb = result.relief!.boundingBox!
    // O bevel padrão do ExtrudeGeometry (0.2mm) estende a geometria 0.2mm
    // além de [0, depth]; por isso a base do relevo fica em thickness - 0.01 - 0.2.
    const BEVEL_THICKNESS = 0.2
    const TEXT_Z_OFFSET = 0.01
    expect(bb.min.z).toBeCloseTo(params.thickness - TEXT_Z_OFFSET - BEVEL_THICKNESS, 5)
    expect(bb.max.z).toBeGreaterThan(params.thickness)
    expect(result.plate.attributes.position.count).toBe(plain.plate.attributes.position.count)
  })

  it('comprime apenas a largura e preserva a altura', () => {
    const wide = buildCakeTopper({
      params: {
        ...defaultCakeTopperParams,
        texts: [text({ content: 'AB', width: 20, height: 10 })],
      },
      fonts: { bold: mockFont('AB') },
    })
    const narrow = buildCakeTopper({
      params: {
        ...defaultCakeTopperParams,
        texts: [text({ content: 'AB', width: 10, height: 10 })],
      },
      fonts: { bold: mockFont('AB') },
    })

    const wideBb = bounds(wide.relief!)
    const narrowBb = bounds(narrow.relief!)
    expect(narrowBb.hw).toBeLessThan(wideBb.hw)
    expect(narrowBb.hh).toBeCloseTo(wideBb.hh, 5)
  })

  it('expõe as meias-extensões reais dos textos e do ícone', () => {
    const params = {
      ...defaultCakeTopperParams,
      svgIcon: SVG_RECT,
      texts: [
        text({ id: 't1', content: 'A', width: 10, height: 10 }),
        text({ id: 't2', content: 'AB', width: 20, height: 10 }),
      ],
    }
    const result = buildCakeTopper({ params, fonts: { bold: mockFont('AB') } })

    expect(result.contentItems.map((item) => item.id)).toEqual(['t1', 't2', 'icon'])
    const narrow = result.contentItems.find((item) => item.id === 't1')!
    const wide = result.contentItems.find((item) => item.id === 't2')!
    expect(narrow.kind).toBe('text')
    expect(narrow.halfWidth).toBeLessThan(wide.halfWidth)
    expect(narrow.halfHeight).toBeCloseTo(wide.halfHeight, 5)

    const icon = result.contentItems.find((item) => item.id === 'icon')!
    expect(icon.kind).toBe('icon')
    expect(icon.halfWidth).toBeGreaterThan(0)
    expect(icon.halfHeight).toBeGreaterThan(0)
  })

  it('relief é null sem fonte disponível', () => {
    const result = buildCakeTopper({ params: defaultCakeTopperParams })
    expect(result.relief).toBeNull()
  })

  it('sinaliza fonte indisponível e ignora o item', () => {
    const onError = vi.fn()
    const result = buildCakeTopper({ params: defaultCakeTopperParams, onError })
    expect(result.relief).toBeNull()
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('bold'))
  })

  it('mantém o canto do texto dentro do contorno circular (eixos acoplados)', () => {
    // width 80, height 50 => raio 25. Offsets grandes em X e Y: com limites
    // independentes por eixo o canto mais distante estouraria o círculo.
    const params = {
      ...defaultCakeTopperParams,
      shape: 'circle' as const,
      texts: [text({ content: 'A', width: 20, height: 10, offsetX: 30, offsetY: 30 })],
    }
    const result = buildCakeTopper({ params, fonts: { bold: mockFont('A') } })
    const bb = bounds(result.relief!)
    const corner = Math.hypot(Math.abs(bb.cx) + bb.hw, Math.abs(bb.cy) + bb.hh)
    expect(corner).toBeLessThanOrEqual(25 + 0.5)
  })

  it('mantém o texto dentro da elipse (eixos acoplados)', () => {
    // width 80, height 50 => rx 40, ry 25.
    const params = {
      ...defaultCakeTopperParams,
      shape: 'oval' as const,
      texts: [text({ content: 'A', width: 20, height: 10, offsetX: 40, offsetY: 40 })],
    }
    const result = buildCakeTopper({ params, fonts: { bold: mockFont('A') } })
    const bb = bounds(result.relief!)
    const ax = Math.abs(bb.cx) + bb.hw
    const ay = Math.abs(bb.cy) + bb.hh
    expect((ax / 40) ** 2 + (ay / 25) ** 2).toBeLessThanOrEqual(1.02)
  })

  it('inclui ícone svg no relevo', () => {
    const params = { ...defaultCakeTopperParams, svgIcon: SVG_RECT, texts: [] }
    const result = buildCakeTopper({ params })
    expect(result.relief).not.toBeNull()
    expect(result.relief!.attributes.position).toBeDefined()
  })

  it('escala ícone grande para caber no contorno', () => {
    // iconScale 2 gera raio útil (~33mm) maior que o raio da placa (25mm).
    const params = {
      ...defaultCakeTopperParams,
      shape: 'circle' as const,
      svgIcon: SVG_RECT,
      iconScale: 2,
      texts: [],
    }
    const result = buildCakeTopper({ params })
    expect(result.relief).not.toBeNull()
    const bb = bounds(result.relief!)
    const corner = Math.hypot(Math.abs(bb.cx) + bb.hw, Math.abs(bb.cy) + bb.hh)
    expect(corner).toBeLessThanOrEqual(25 + 0.5)
  })

  it('posiciona o ícone pelos offsets informados', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'rounded-rect' as const,
      width: 120,
      height: 80,
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconOffsetX: 30,
      iconOffsetY: 20,
      texts: [],
    }
    const result = buildCakeTopper({ params })
    const bb = bounds(result.relief!)
    expect(bb.cx).toBeCloseTo(30, 0)
    expect(bb.cy).toBeCloseTo(20, 0)
  })

  it('limita o ícone ao contorno da placa', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'circle' as const,
      width: 80,
      height: 50,
      svgIcon: SVG_RECT,
      iconScale: 2,
      iconOffsetX: 100,
      iconOffsetY: 100,
      texts: [],
    }
    const result = buildCakeTopper({ params })
    const bb = bounds(result.relief!)
    const corner = Math.hypot(Math.abs(bb.cx) + bb.hw, Math.abs(bb.cy) + bb.hh)
    expect(corner).toBeLessThanOrEqual(25 + 0.5)
  })
})

describe('buildCakeTopper - fixação (support)', () => {
  it('haste fica abaixo da placa e embutida nela', () => {
    const params = { ...defaultCakeTopperParams, supportType: 'haste' as const }
    const result = buildCakeTopper({ params })
    result.plate.computeBoundingBox()
    const plateMinY = result.plate.boundingBox!.min.y
    expect(result.support).not.toBeNull()
    result.support!.computeBoundingBox()
    // Topo da haste avança STEM_EMBED (2mm) para dentro da placa.
    expect(result.support!.boundingBox!.max.y).toBeCloseTo(plateMinY + 2, 5)
  })

  it('haste se ancora sob o fundo real do contorno (não flutua)', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'custom' as const,
      contourSvg: SVG_TRIANGLE,
      width: 100,
      height: 100,
      supportType: 'haste' as const,
    }
    const result = buildCakeTopper({ params })
    result.plate.computeBoundingBox()
    const pb = result.plate.boundingBox!
    result.support!.computeBoundingBox()
    const sb = result.support!.boundingBox!
    const stemHalfWidth = (sb.max.x - sb.min.x) / 2

    // O fundo real do triângulo é um bico deslocado (não em x=0); a borda da
    // haste deve ficar sob esse fundo, dentro do intervalo de X da faixa
    // inferior da placa (o círculo inteiro precisa caber na placa).
    const band = xIntervalInBand(result.plate, pb.min.y, pb.min.y + 1)!
    expect(sb.min.x).toBeGreaterThanOrEqual(band.min - 0.25)
    expect(sb.min.x).toBeLessThanOrEqual(band.max + 0.25)
    expect(stemHalfWidth).toBeCloseTo(params.thickness / 2, 5)
  })

  it('haste permanece centralizada em formas simétricas', () => {
    const params = { ...defaultCakeTopperParams, shape: 'circle' as const, supportType: 'haste' as const }
    const result = buildCakeTopper({ params })
    result.support!.computeBoundingBox()
    const sb = result.support!.boundingBox!
    expect((sb.min.x + sb.max.x) / 2).toBeCloseTo(0, 3)
  })

  it('haste tem seção quadrada da espessura da placa e ponta chanfrada', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'rounded-rect' as const,
      supportType: 'haste' as const,
    }
    const result = buildCakeTopper({ params })
    const support = result.support!
    support.computeBoundingBox()
    const bb = support.boundingBox!
    const geometry = support
    const pos = geometry.getAttribute('position')
    const centerX = (bb.min.x + bb.max.x) / 2

    let maxHalfWidthAtBottom = 0
    let maxHalfWidthAtTop = 0
    let degenerate = 0
    for (let i = 0; i < pos.count; i += 3) {
      const ax = pos.getX(i)
      const ay = pos.getY(i)
      const az = pos.getZ(i)
      const bx = pos.getX(i + 1)
      const by = pos.getY(i + 1)
      const bz = pos.getZ(i + 1)
      const cx = pos.getX(i + 2)
      const cy = pos.getY(i + 2)
      const cz = pos.getZ(i + 2)

      const abx = bx - ax
      const aby = by - ay
      const abz = bz - az
      const acx = cx - ax
      const acy = cy - ay
      const acz = cz - az
      const crossX = aby * acz - abz * acy
      const crossY = abz * acx - abx * acz
      const crossZ = abx * acy - aby * acx
      if (crossX * crossX + crossY * crossY + crossZ * crossZ <= 1e-18) degenerate++

      if (ay <= bb.min.y + 1e-6) {
        maxHalfWidthAtBottom = Math.max(maxHalfWidthAtBottom, Math.abs(ax - centerX))
      }
      if (ay >= bb.max.y - 1e-6) {
        maxHalfWidthAtTop = Math.max(maxHalfWidthAtTop, Math.abs(ax - centerX))
      }
    }

    expect(bb.max.z - bb.min.z).toBeCloseTo(params.thickness, 5)
    expect(bb.max.x - bb.min.x).toBeCloseTo(params.thickness, 5)
    expect(maxHalfWidthAtBottom).toBeCloseTo(0.4, 1)
    expect(maxHalfWidthAtTop).toBeCloseTo(params.thickness / 2, 1)
    expect(degenerate).toBe(0)
  })

  it('limita a ponta chanfrada a metade do comprimento', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'rounded-rect' as const,
      supportType: 'haste' as const,
      thickness: 4,
      stemLength: 15,
    }
    const result = buildCakeTopper({ params })
    const support = result.support!
    support.computeBoundingBox()
    const bb = support.boundingBox!
    const pos = support.getAttribute('position')
    const centerX = (bb.min.x + bb.max.x) / 2
    const tipLength = Math.min(
      params.thickness * 2.5,
      params.stemLength * 0.5,
    )
    const tipBaseY = bb.min.y + tipLength

    let maxHalfWidthAtTipBase = 0
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      if (Math.abs(y - tipBaseY) < 0.01) {
        maxHalfWidthAtTipBase = Math.max(
          maxHalfWidthAtTipBase,
          Math.abs(pos.getX(i) - centerX),
        )
      }
    }

    expect(maxHalfWidthAtTipBase).toBeCloseTo(params.thickness / 2, 1)
  })

  it('haste dupla gera duas hastes com o espaçamento configurado', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'rounded-rect' as const,
      supportType: 'haste-dupla' as const,
      stemSpacing: 30,
    }
    const result = buildCakeTopper({ params })
    const support = result.support!
    support.computeBoundingBox()
    const bb = support.boundingBox!
    const plate = result.plate
    plate.computeBoundingBox()
    const plateMinY = plate.boundingBox!.min.y

    expect(bb.max.x - bb.min.x).toBeCloseTo(params.stemSpacing + params.thickness, 1)
    expect(bb.max.y - bb.min.y).toBeCloseTo(params.stemLength, 5)
    expect(bb.max.y).toBeCloseTo(plateMinY + 2, 5)

    const pos = support.getAttribute('position')
    let minAbsX = Infinity
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      if (Math.abs(x) > 1e-6) minAbsX = Math.min(minAbsX, Math.abs(x))
    }

    expect(minAbsX).toBeGreaterThan(params.stemSpacing / 2 - params.thickness / 2 - 0.1)
  })

  it('aproxima as hastes mantendo o par simétrico', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'circle' as const,
      width: 50,
      height: 50,
      supportType: 'haste-dupla' as const,
      stemSpacing: 40,
    }
    const result = buildCakeTopper({ params })
    const support = result.support!
    support.computeBoundingBox()
    const sb = support.boundingBox!

    expect(sb.max.x - sb.min.x).toBeGreaterThan(params.thickness)
    expect(Math.abs((sb.min.x + sb.max.x) / 2)).toBeLessThan(1)
  })

  it('usa haste simples quando não há espaço para duas hastes', () => {
    const onError = vi.fn()
    const params = {
      ...defaultCakeTopperParams,
      shape: 'custom' as const,
      contourSvg: SVG_NARROW,
      width: 100,
      height: 100,
      supportType: 'haste-dupla' as const,
      thickness: 4,
      stemSpacing: 20,
    }
    const result = buildCakeTopper({ params, onError })
    expect(result.support).not.toBeNull()
    result.support!.computeBoundingBox()
    const bb = result.support!.boundingBox!
    const centerX = (bb.min.x + bb.max.x) / 2
    expect(plateBottomAtX(result.plate, centerX, params.thickness)).not.toBeNull()
    result.plate.computeBoundingBox()
    const pb = result.plate.boundingBox!
    expect(bb.min.x).toBeGreaterThanOrEqual(pb.min.x - 0.5)
    expect(bb.max.x).toBeLessThanOrEqual(pb.max.x + 0.5)

    expect(bb.max.x - bb.min.x).toBeCloseTo(params.thickness, 1)
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('haste simples'))
  })

  it('posiciona a haste dupla sob os lobes de um contorno desconexo', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'custom' as const,
      contourSvg: SVG_DISCONNECTED,
      width: 100,
      height: 100,
      supportType: 'haste-dupla' as const,
      stemSpacing: 10,
    }
    const result = buildCakeTopper({ params })
    const support = result.support!
    const pos = support.getAttribute('position')
    let hasVertexInGap = false
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getX(i)) < 19.9) hasVertexInGap = true
    }

    expect(hasVertexInGap).toBe(false)
  })

  it('não posiciona a haste sobre um entalhe do contorno', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'custom' as const,
      contourSvg: SVG_NOTCH,
      width: 100,
      height: 100,
      supportType: 'haste' as const,
    }
    const result = buildCakeTopper({ params })
    const support = result.support!
    support.computeBoundingBox()
    const bb = support.boundingBox!

    // O entalhe tem 2mm (x≈1..3): a haste não pode cobri-lo.
    expect(bb.max.x <= 1 + 0.01 || bb.min.x >= 3 - 0.01).toBe(true)
  })
})

describe('disposeCakeTopperResult', () => {
  it('libera placa, relevo e suporte', () => {
    const params = {
      ...defaultCakeTopperParams,
      supportType: 'haste' as const,
      texts: [text({ content: 'A' })],
    }
    const result = buildCakeTopper({ params, fonts: { bold: mockFont('A') } })
    expect(result.relief).not.toBeNull()
    expect(result.support).not.toBeNull()

    const plateSpy = vi.spyOn(result.plate, 'dispose')
    const reliefSpy = vi.spyOn(result.relief!, 'dispose')
    const supportSpy = vi.spyOn(result.support!, 'dispose')

    expect(() => disposeCakeTopperResult(result)).not.toThrow()
    expect(plateSpy).toHaveBeenCalled()
    expect(reliefSpy).toHaveBeenCalled()
    expect(supportSpy).toHaveBeenCalled()
  })
})
