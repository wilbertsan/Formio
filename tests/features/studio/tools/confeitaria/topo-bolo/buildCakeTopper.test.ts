import { describe, it, expect, vi } from 'vitest'
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3, type BufferGeometry } from 'three'
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

// Deve bater com BASE_FLOOR em buildCakeTopper.ts.
const BASE_FLOOR = 3

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
      iconPosition: 'center' as const,
      texts: [],
    }
    const result = buildCakeTopper({ params })
    expect(result.relief).not.toBeNull()
    const bb = bounds(result.relief!)
    const corner = Math.hypot(Math.abs(bb.cx) + bb.hw, Math.abs(bb.cy) + bb.hh)
    expect(corner).toBeLessThanOrEqual(25 + 0.5)
  })
})

describe('buildCakeTopper - corte (cut)', () => {
  it('subtrai o texto da placa em modo corte', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'rounded-rect' as const,
      textMode: 'cut' as const,
      texts: [text({ content: 'A', width: 20, height: 10 })],
    }
    const result = buildCakeTopper({ params, fonts: { bold: mockFont('A') } })
    expect(result.relief).toBeNull()
    expect(result.plate.attributes.position).toBeDefined()
  })

  it('corte remove material da placa', () => {
    const base = { ...defaultCakeTopperParams, shape: 'rounded-rect' as const }
    const plain = buildCakeTopper({ params: base })
    const params = {
      ...base,
      textMode: 'cut' as const,
      texts: [text({ content: 'AB', width: 30, height: 12 })],
    }
    const cut = buildCakeTopper({ params, fonts: { bold: mockFont('AB') } })
    expect(cut.relief).toBeNull()
    const plainCount = plain.plate.attributes.position.count
    const cutCount = cut.plate.attributes.position.count
    expect(cutCount).toBeGreaterThan(0)
    expect(cutCount).not.toBe(plainCount)
  })

  it('ícone em modo corte reduz o material da placa', () => {
    const base = { ...defaultCakeTopperParams, shape: 'rounded-rect' as const }
    const plain = buildCakeTopper({ params: base })
    const params = {
      ...base,
      textMode: 'cut' as const,
      svgIcon: SVG_RECT,
      iconPosition: 'center' as const,
      texts: [],
    }
    const cut = buildCakeTopper({ params })
    expect(cut.relief).toBeNull()
    expect(cut.plate.attributes.position.count).not.toBe(plain.plate.attributes.position.count)
  })

  it('sem geometria de corte mantém a placa intacta', () => {
    const params = { ...defaultCakeTopperParams, textMode: 'cut' as const }
    const result = buildCakeTopper({ params })
    expect(result.plate.attributes.position).toBeDefined()
    expect(result.relief).toBeNull()
  })

  it('corte que alcança a borda cai para relevo', () => {
    const onError = vi.fn()
    const params = {
      ...defaultCakeTopperParams,
      textMode: 'cut' as const,
      texts: [text({ content: 'AAAAA', width: 90, height: 40 })],
    }
    const result = buildCakeTopper({ params, fonts: { bold: mockFont('AAAAA') }, onError })
    expect(onError).toHaveBeenCalled()
    expect(result.relief).not.toBeNull()
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
      stemDiameter: 4,
    }
    const result = buildCakeTopper({ params })
    result.plate.computeBoundingBox()
    const pb = result.plate.boundingBox!
    result.support!.computeBoundingBox()
    const sb = result.support!.boundingBox!
    const stemX = (sb.min.x + sb.max.x) / 2

    // O fundo real do triângulo é um bico deslocado (não em x=0); a haste deve
    // ficar sob esse fundo, dentro do intervalo de X da faixa inferior da placa.
    const band = xIntervalInBand(result.plate, pb.min.y, pb.min.y + 1)!
    expect(stemX).toBeGreaterThanOrEqual(band.min - 0.25)
    expect(stemX).toBeLessThanOrEqual(band.max + 0.25)
  })

  it('haste permanece centralizada em formas simétricas', () => {
    const params = { ...defaultCakeTopperParams, shape: 'circle' as const, supportType: 'haste' as const }
    const result = buildCakeTopper({ params })
    result.support!.computeBoundingBox()
    const sb = result.support!.boundingBox!
    expect((sb.min.x + sb.max.x) / 2).toBeCloseTo(0, 3)
  })

  it('base é transladada para o lado da placa', () => {
    const params = {
      ...defaultCakeTopperParams,
      supportType: 'base' as const,
      baseWidth: 40,
    }
    const result = buildCakeTopper({ params })
    expect(result.support).not.toBeNull()
    result.support!.computeBoundingBox()
    expect(result.support!.boundingBox!.min.x).toBeGreaterThan(defaultCakeTopperParams.width / 2)
  })

  it('base tem piso e forma um corpo conectado (canal não atravessa)', () => {
    const params = {
      ...defaultCakeTopperParams,
      supportType: 'base' as const,
      baseWidth: 40,
      slotDepth: 10,
    }
    const result = buildCakeTopper({ params })
    const support = result.support!
    support.computeBoundingBox()
    const bb = support.boundingBox!

    // A altura inclui o piso.
    expect(bb.max.y - bb.min.y).toBeCloseTo(params.slotDepth + BASE_FLOOR, 5)

    // Um raio pelo centro do canal encontra o piso (entrada e saída = sólido
    // fechado). Se o canal atravessasse o bloco, o raio passaria direto.
    const centerX = (bb.min.x + bb.max.x) / 2
    const centerZ = (bb.min.z + bb.max.z) / 2
    const raycaster = new Raycaster(
      new Vector3(centerX, bb.max.y + 5, centerZ),
      new Vector3(0, -1, 0),
    )
    const mesh = new Mesh(support, new MeshBasicMaterial({ side: DoubleSide }))
    const hits = raycaster.intersectObject(mesh)
    expect(hits.length).toBeGreaterThanOrEqual(2)
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
