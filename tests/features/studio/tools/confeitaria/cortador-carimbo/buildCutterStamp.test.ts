import { describe, it, expect } from 'vitest'
import { type BufferGeometry, Path, Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildCutterStamp } from '@/features/studio/tools/confeitaria/cortador-carimbo/buildCutterStamp'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import {
  defaultCutterStampParams,
  BASE_HEIGHT_RATIO,
  CLEARANCE_MM,
  MAX_SHAPE_WIDTH_MM,
} from '@/features/studio/tools/confeitaria/cortador-carimbo/schema'

const FONT_WIDTH_FACTOR = 0.6

function mockFont(): Font {
  return {
    generateShapes: (text: string, size: number) => {
      const width = text.trim().length * size * FONT_WIDTH_FACTOR
      const height = size
      return [new Shape([
        new Vector2(-width / 2, -height / 2),
        new Vector2(width / 2, -height / 2),
        new Vector2(width / 2, height / 2),
        new Vector2(-width / 2, height / 2),
      ])]
    },
  } as unknown as Font
}

function bbox(geometry: ReturnType<typeof buildCutterStamp>['cutter']) {
  geometry.computeBoundingBox()
  return geometry.boundingBox!
}

// Fonte mock com furo interno (como a letra 'd'/'o').
function mockFontHoled(): Font {
  return {
    generateShapes: (text: string, size: number) => {
      const width = text.trim().length * size * FONT_WIDTH_FACTOR
      const height = size
      const shape = new Shape([
        new Vector2(-width / 2, -height / 2),
        new Vector2(width / 2, -height / 2),
        new Vector2(width / 2, height / 2),
        new Vector2(-width / 2, height / 2),
      ])
      const hw = width / 4
      const hh = height / 4
      shape.holes.push(new Path([
        new Vector2(-hw, -hh),
        new Vector2(-hw, hh),
        new Vector2(hw, hh),
        new Vector2(hw, -hh),
      ]))
      return [shape]
    },
  } as unknown as Font
}

// Conta componentes conexos pela malha (vértices compartilhados por triângulos).
function componentCount(geometry: BufferGeometry): number {
  const position = geometry.attributes.position
  const index = geometry.index
  const key = (i: number) => `${position.getX(i).toFixed(4)},${position.getY(i).toFixed(4)},${position.getZ(i).toFixed(4)}`
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    let root = x
    while (parent.get(root) !== root) root = parent.get(root)!
    return root
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  const count = index ? index.count : position.count
  for (let i = 0; i < count; i += 3) {
    const a = key(index ? index.getX(i) : i)
    const b = key(index ? index.getX(i + 1) : i + 1)
    const c = key(index ? index.getX(i + 2) : i + 2)
    for (const v of [a, b, c]) if (!parent.has(v)) parent.set(v, v)
    union(a, b)
    union(b, c)
  }

  const roots = new Set<string>()
  for (const k of parent.keys()) roots.add(find(k))
  return roots.size
}

const params = { ...defaultCutterStampParams, text: 'AB', textHeight: 25 }
const textWidth = 'AB'.length * params.textHeight * FONT_WIDTH_FACTOR

describe('buildCutterStamp - peças', () => {
  it('retorna cortador, base e relevo', () => {
    const result = buildCutterStamp({ params, font: mockFont() })
    expect(result.cutter).toBeDefined()
    expect(result.stampBase).toBeDefined()
    expect(result.stampRelief).toBeDefined()
  })

  it('aceita texto vazio sem lançar', () => {
    const empty = { ...defaultCutterStampParams, text: '   ' }
    expect(() => buildCutterStamp({ params: empty, font: mockFont() })).not.toThrow()
  })
})

describe('buildCutterStamp - cortador', () => {
  it('corta o contorno da palavra com margem (parede + folga)', () => {
    const cutter = bbox(buildCutterStamp({ params, font: mockFont() }).cutter)
    const openingWidth = textWidth + 2 * params.baseMargin
    expect(cutter.max.x - cutter.min.x).toBeCloseTo(openingWidth + 2 * params.wallThickness, 0)
  })

  it('é uma peça única, sem parede interna separada do furo da letra', () => {
    const cutter = buildCutterStamp({ params, font: mockFontHoled() }).cutter
    expect(componentCount(cutter)).toBe(1)
  })
})

describe('buildCutterStamp - base do carimbo', () => {
  it('base é maior que o texto (une as letras com a margem)', () => {
    const base = bbox(buildCutterStamp({ params, font: mockFont() }).stampBase)
    expect(base.max.x - base.min.x).toBeCloseTo(textWidth + 2 * (params.baseMargin - CLEARANCE_MM), 0)
    expect(base.max.x - base.min.x).toBeGreaterThan(textWidth)
  })

  it('base encaixa dentro da abertura do cortador', () => {
    const result = buildCutterStamp({ params, font: mockFont() })
    const base = bbox(result.stampBase)
    const cutter = bbox(result.cutter)
    const openingWidth = cutter.max.x - cutter.min.x - 2 * params.wallThickness
    expect(base.max.x - base.min.x).toBeLessThan(openingWidth)
  })
})

describe('buildCutterStamp - relevo em alto relevo', () => {
  it('relevo tem a largura do texto', () => {
    const relief = bbox(buildCutterStamp({ params, font: mockFont() }).stampRelief)
    expect(relief.max.x - relief.min.x).toBeCloseTo(textWidth, 0)
  })

  it('relevo fica na face de contato (z de 0 a reliefHeight)', () => {
    const relief = bbox(buildCutterStamp({ params, font: mockFont() }).stampRelief)
    expect(relief.min.z).toBeCloseTo(0, 1)
    expect(relief.max.z).toBeCloseTo(params.reliefHeight, 1)
  })

  it('relevo cabe dentro da base', () => {
    const result = buildCutterStamp({ params, font: mockFont() })
    const relief = bbox(result.stampRelief)
    const base = bbox(result.stampBase)
    expect(relief.min.x).toBeGreaterThanOrEqual(base.min.x)
    expect(relief.max.x).toBeLessThanOrEqual(base.max.x)
  })
})

describe('buildCutterStamp - carimbo empilhado', () => {
  it('base começa acima do relevo', () => {
    const result = buildCutterStamp({ params, font: mockFont() })
    const base = bbox(result.stampBase)
    expect(base.min.z).toBeCloseTo(params.reliefHeight, 1)
  })

  it('base tem a espessura definida por BASE_HEIGHT_RATIO (sem cabo)', () => {
    const result = buildCutterStamp({ params, font: mockFont() })
    const base = bbox(result.stampBase)
    const remaining = params.stampHeight - params.reliefHeight
    expect(base.min.z).toBeCloseTo(params.reliefHeight, 1)
    expect(base.max.z).toBeCloseTo(params.reliefHeight + remaining * BASE_HEIGHT_RATIO, 1)
  })
})

describe('buildCutterStamp - layout', () => {
  it('posiciona as peças lado a lado sem sobreposição', () => {
    const result = buildCutterStamp({ params, font: mockFont() })
    expect(bbox(result.cutter).max.x).toBeLessThan(bbox(result.stampBase).min.x)
  })

  it('centraliza as peças no eixo Y', () => {
    const result = buildCutterStamp({ params, font: mockFont() })
    const cutter = bbox(result.cutter)
    expect((cutter.min.y + cutter.max.y) / 2).toBeCloseTo(0, 0)
  })

  it('reduz o texto quando excede a largura máxima', () => {
    const longParams = { ...defaultCutterStampParams, text: 'a'.repeat(30), textHeight: 60 }
    const cutter = bbox(buildCutterStamp({ params: longParams, font: mockFont() }).cutter)
    expect(cutter.max.x - cutter.min.x).toBeLessThan(MAX_SHAPE_WIDTH_MM + 30)
  })
})

describe('buildCutterStamp - svg', () => {
  const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20"><rect x="0" y="0" width="40" height="20" fill="#000"/></svg>'
  const svgParams = { ...defaultCutterStampParams, contentType: 'svg' as const, svgIcon: SVG, textHeight: 20, iconScale: 1 }

  it('gera as três peças a partir de um svg', () => {
    const result = buildCutterStamp({ params: svgParams, font: mockFont() })
    expect(result.cutter).toBeDefined()
    expect(result.stampBase).toBeDefined()
    expect(result.stampRelief).toBeDefined()
  })

  it('dimensiona o relevo pela altura-alvo (textHeight × iconScale)', () => {
    const relief = bbox(buildCutterStamp({ params: svgParams, font: mockFont() }).stampRelief)
    expect(relief.max.y - relief.min.y).toBeCloseTo(20, 0)
  })

  it('o cortador é uma peça única (sem paredes internas)', () => {
    const cutter = buildCutterStamp({ params: svgParams, font: mockFont() }).cutter
    expect(componentCount(cutter)).toBe(1)
  })

  it('não lança quando o svg está ausente', () => {
    const empty = { ...defaultCutterStampParams, contentType: 'svg' as const, svgIcon: null }
    expect(() => buildCutterStamp({ params: empty, font: mockFont() })).not.toThrow()
  })

  it('aceita SVG já achatado (caminho do Web Worker, sem DOM)', () => {
    const parsed = parseSvg(SVG)!
    expect(parsed).not.toBeNull()
    const result = buildCutterStamp({ params: svgParams, font: null, parsedSvg: parsed })
    expect(result.cutter.attributes.position.count).toBeGreaterThan(0)
  })
})
