import { describe, it, expect, vi } from 'vitest'
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

  it('inclui ícone svg no relevo', () => {
    const params = { ...defaultCakeTopperParams, svgIcon: SVG_RECT, texts: [] }
    const result = buildCakeTopper({ params })
    expect(result.relief).not.toBeNull()
    expect(result.relief!.attributes.position).toBeDefined()
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
  it('haste fica abaixo da placa', () => {
    const params = { ...defaultCakeTopperParams, supportType: 'haste' as const }
    const result = buildCakeTopper({ params })
    expect(result.support).not.toBeNull()
    result.support!.computeBoundingBox()
    expect(result.support!.boundingBox!.max.y).toBeLessThanOrEqual(0.1)
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
})

describe('disposeCakeTopperResult', () => {
  it('libera as geometrias sem lançar', () => {
    const result = buildCakeTopper({ params: defaultCakeTopperParams })
    const plateSpy = vi.spyOn(result.plate, 'dispose')
    expect(() => disposeCakeTopperResult(result)).not.toThrow()
    expect(plateSpy).toHaveBeenCalled()
  })
})
