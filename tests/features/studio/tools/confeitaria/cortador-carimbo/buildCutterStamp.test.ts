import { describe, it, expect } from 'vitest'
import { Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildCutterStamp } from '@/features/studio/tools/confeitaria/cortador-carimbo/buildCutterStamp'
import {
  defaultCutterStampParams,
  CLEARANCE_MM,
  HANDLE_HEIGHT_RATIO,
  MAX_TEXT_WIDTH_MM,
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

const params = { ...defaultCutterStampParams, text: 'AB', textHeight: 25 }
const textWidth = 'AB'.length * params.textHeight * FONT_WIDTH_FACTOR

describe('buildCutterStamp - peças', () => {
  it('retorna cortador, base, relevo e cabo', () => {
    const result = buildCutterStamp({ params, font: mockFont() })
    expect(result.cutter).toBeDefined()
    expect(result.stampBase).toBeDefined()
    expect(result.stampRelief).toBeDefined()
    expect(result.stampHandle).toBeDefined()
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

  it('cabo fica acima da base e termina na altura total', () => {
    const result = buildCutterStamp({ params, font: mockFont() })
    const base = bbox(result.stampBase)
    const handle = bbox(result.stampHandle)
    const remaining = params.stampHeight - params.reliefHeight
    expect(handle.min.z).toBeCloseTo(base.max.z, 0)
    expect(base.max.z).toBeCloseTo(params.reliefHeight + remaining * (1 - HANDLE_HEIGHT_RATIO), 0)
    expect(handle.max.z).toBeCloseTo(params.stampHeight, 0)
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
    expect(cutter.max.x - cutter.min.x).toBeLessThan(MAX_TEXT_WIDTH_MM + 30)
  })
})
