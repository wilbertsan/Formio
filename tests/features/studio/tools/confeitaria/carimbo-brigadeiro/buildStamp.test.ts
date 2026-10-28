import { describe, it, expect } from 'vitest'
import { Font, type FontData } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildStamp } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp'
import { defaultStampParams } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/schema'

describe('buildStamp', () => {
  it('builds base geometry', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.base).toBeDefined()
    expect(result.base.attributes.position).toBeDefined()
  })

  it('builds handle geometry', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.handle).toBeDefined()
    expect(result.handle.attributes.position).toBeDefined()
  })

  it('returns null for text when font is null', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.text).toBeNull()
  })

  it('returns null for icon when svgIcon is null', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.icon).toBeNull()
  })

  it('base height is 40% of total height', () => {
    const params = { ...defaultStampParams, height: 20 }
    const result = buildStamp({ params, font: null })

    result.base.computeBoundingBox()
    const bb = result.base.boundingBox!
    const baseHeight = bb.max.z - bb.min.z

    expect(baseHeight).toBeCloseTo(8, 0) // 20 * 0.4 = 8mm + bevel
  })

  it('handle height is 60% of total height', () => {
    const params = { ...defaultStampParams, height: 20 }
    const result = buildStamp({ params, font: null })

    result.handle.computeBoundingBox()
    const bb = result.handle.boundingBox!
    const handleHeight = bb.max.z - bb.min.z

    expect(handleHeight).toBeCloseTo(12, 0) // 20 * 0.6 = 12mm + bevel
  })
})

describe('buildStamp - text', () => {
  const mockFontData: FontData = {
    glyphs: {
      T: { ha: 600, x_min: 0, x_max: 600, o: 'm 0 0 l 600 0 l 600 100 l 0 100 z' },
      t: { ha: 400, x_min: 0, x_max: 400, o: 'm 0 0 l 400 0 l 400 100 l 0 100 z' },
      e: { ha: 400, x_min: 0, x_max: 400, o: 'm 0 0 l 400 0 l 400 100 l 0 100 z' },
      s: { ha: 400, x_min: 0, x_max: 400, o: 'm 0 0 l 400 0 l 400 100 l 0 100 z' },
      P: { ha: 600, x_min: 0, x_max: 600, o: 'm 0 0 l 600 0 l 600 100 l 0 100 z' },
      a: { ha: 400, x_min: 0, x_max: 400, o: 'm 0 0 l 400 0 l 400 100 l 0 100 z' },
      r: { ha: 300, x_min: 0, x_max: 300, o: 'm 0 0 l 300 0 l 300 100 l 0 100 z' },
      b: { ha: 400, x_min: 0, x_max: 400, o: 'm 0 0 l 400 0 l 400 100 l 0 100 z' },
      'é': { ha: 400, x_min: 0, x_max: 400, o: 'm 0 0 l 400 0 l 400 100 l 0 100 z' },
      n: { ha: 400, x_min: 0, x_max: 400, o: 'm 0 0 l 400 0 l 400 100 l 0 100 z' },
    },
    familyName: 'Mock',
    ascender: 800,
    descender: -200,
    underlinePosition: 0,
    underlineThickness: 0,
    boundingBox: { xMin: 0, xMax: 600, yMin: -200, yMax: 800 },
    resolution: 1000,
    original_font_information: {},
  }

  it('builds text geometry when font is provided', () => {
    const mockFont = new Font(mockFontData)
    const params = { ...defaultStampParams, text: 'Teste' }
    const result = buildStamp({ params, font: mockFont })
    
    expect(result.text).toBeDefined()
    expect(result.text).not.toBeNull()
  })

  it('returns null for text when font is null', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.text).toBeNull()
  })

  it('text depth is RELIEF_DEPTH (1mm) + bevel', () => {
    const mockFont = new Font(mockFontData)
    const result = buildStamp({ params: { ...defaultStampParams, text: 'Teste' }, font: mockFont })

    if (result.text) {
      result.text.computeBoundingBox()
      const bb = result.text.boundingBox!
      const depth = bb.max.z - bb.min.z
      expect(depth).toBeCloseTo(1.2, 0)
    }
  })

  it('shrinks long text to fit inside the stamp circle', () => {
    const mockFont = new Font(mockFontData)
    const params = { ...defaultStampParams, text: 'Parabéns', fontSize: 15, diameter: 20 }
    const result = buildStamp({ params, font: mockFont })

    expect(result.text).not.toBeNull()
    result.text!.computeBoundingBox()
    const bb = result.text!.boundingBox!
    const halfWidth = (bb.max.x - bb.min.x) / 2
    const halfHeight = (bb.max.y - bb.min.y) / 2

    expect(Math.hypot(halfWidth, halfHeight)).toBeLessThanOrEqual(params.diameter / 2)
  })

  it('keeps the requested size when short text already fits', () => {
    const mockFont = new Font(mockFontData)
    const small = buildStamp({
      params: { ...defaultStampParams, text: 'T', fontSize: 6 },
      font: mockFont,
    })
    const large = buildStamp({
      params: { ...defaultStampParams, text: 'T', fontSize: 12 },
      font: mockFont,
    })

    small.text!.computeBoundingBox()
    large.text!.computeBoundingBox()
    const smallWidth = small.text!.boundingBox!.max.x - small.text!.boundingBox!.min.x
    const largeWidth = large.text!.boundingBox!.max.x - large.text!.boundingBox!.min.x

    expect(largeWidth).toBeGreaterThan(smallWidth)
  })

  it('does not build text when contentType is svg', () => {
    const mockFont = new Font(mockFontData)
    const params = { ...defaultStampParams, contentType: 'svg' as const, text: 'Teste' }
    const result = buildStamp({ params, font: mockFont })
    expect(result.text).toBeNull()
  })
})

describe('buildStamp - icon', () => {
  const svgString = '<svg><circle cx="10" cy="10" r="5"/></svg>'

  it('builds icon geometry when contentType is svg and svgIcon is provided', () => {
    const params = { ...defaultStampParams, contentType: 'svg' as const, svgIcon: svgString }
    const result = buildStamp({ params, font: null })

    expect(result.icon).toBeDefined()
    expect(result.icon).not.toBeNull()
  })

  it('does not build icon when contentType is text', () => {
    const params = { ...defaultStampParams, contentType: 'text' as const, svgIcon: svgString }
    const result = buildStamp({ params, font: null })
    expect(result.icon).toBeNull()
  })

  it('returns null for icon when svgIcon is null', () => {
    const params = { ...defaultStampParams, contentType: 'svg' as const }
    const result = buildStamp({ params, font: null })
    expect(result.icon).toBeNull()
  })

  it('fits the icon inside the stamp circle', () => {
    const params = { ...defaultStampParams, contentType: 'svg' as const, svgIcon: svgString, diameter: 20 }
    const result = buildStamp({ params, font: null })

    const position = result.icon!.attributes.position
    let maxDistance = 0
    for (let i = 0; i < position.count; i++) {
      const distance = Math.hypot(position.getX(i), position.getY(i))
      if (distance > maxDistance) maxDistance = distance
    }

    expect(maxDistance).toBeLessThanOrEqual(params.diameter / 2)
  })

  it('scales the icon to fill the usable stamp radius', () => {
    // Círculo de raio 5 → com diâmetro 20 e margem 1.5, deve preencher 8.5mm
    const params = { ...defaultStampParams, contentType: 'svg' as const, svgIcon: svgString, diameter: 20, iconScale: 1.0 }
    const result = buildStamp({ params, font: null })

    const position = result.icon!.attributes.position
    let maxDistance = 0
    for (let i = 0; i < position.count; i++) {
      const distance = Math.hypot(position.getX(i), position.getY(i))
      if (distance > maxDistance) maxDistance = distance
    }

    expect(maxDistance).toBeCloseTo(8.5, 0)
  })

  it('thickens thin filled shapes to the minimum line width', () => {
    // Retângulo fino (80×2) em viewBox 100 — sem engrossar ficaria ~0.4mm.
    const thinRect = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="49" width="80" height="2"/></svg>'
    const params = { ...defaultStampParams, contentType: 'svg' as const, svgIcon: thinRect }
    const result = buildStamp({ params, font: null })

    expect(result.icon).not.toBeNull()
    result.icon!.computeBoundingBox()
    const bb = result.icon!.boundingBox!
    const height = bb.max.y - bb.min.y

    expect(height).toBeGreaterThanOrEqual(params.iconLineWidth)
  })

  it('builds geometry for stroke-only paths with the minimum width', () => {
    // Path só de linha (fill=none) — antes geraria geometria vazia.
    const strokeOnly = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 50 L90 50" fill="none" stroke="black" stroke-width="1"/></svg>'
    const params = { ...defaultStampParams, contentType: 'svg' as const, svgIcon: strokeOnly }
    const result = buildStamp({ params, font: null })

    expect(result.icon).not.toBeNull()
    result.icon!.computeBoundingBox()
    const bb = result.icon!.boundingBox!
    const height = bb.max.y - bb.min.y

    expect(height).toBeGreaterThanOrEqual(params.iconLineWidth)
  })

  it('thickens strokes according to iconLineWidth', () => {
    const strokeOnly = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 50 L90 50" fill="none" stroke="black" stroke-width="1"/></svg>'
    const thin = buildStamp({
      params: { ...defaultStampParams, contentType: 'svg' as const, svgIcon: strokeOnly, iconLineWidth: 0.2 },
      font: null,
    })
    const thick = buildStamp({
      params: { ...defaultStampParams, contentType: 'svg' as const, svgIcon: strokeOnly, iconLineWidth: 1.0 },
      font: null,
    })

    thin.icon!.computeBoundingBox()
    thick.icon!.computeBoundingBox()
    const thinHeight = thin.icon!.boundingBox!.max.y - thin.icon!.boundingBox!.min.y
    const thickHeight = thick.icon!.boundingBox!.max.y - thick.icon!.boundingBox!.min.y

    expect(thickHeight).toBeGreaterThan(thinHeight)
  })

  it('rotates the icon 180° about Z', () => {
    // Triângulo com ápice no topo em coordenadas SVG (Y para baixo)
    const triangle = '<svg><path d="M5 0 L10 10 L0 10 Z"/></svg>'
    const params = { ...defaultStampParams, contentType: 'svg' as const, svgIcon: triangle }
    const result = buildStamp({ params, font: null })

    const position = result.icon!.attributes.position
    let maxY = -Infinity
    let xAtMaxY = 0
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i)
      if (y > maxY) {
        maxY = y
        xAtMaxY = position.getX(i)
      }
    }

    // Após girar 180°, o ápice (X≈0) fica no topo (maior Y), não na base.
    expect(Math.abs(xAtMaxY)).toBeLessThan(1)
  })

  it('scales the icon with iconScale', () => {
    const params1 = { ...defaultStampParams, contentType: 'svg' as const, svgIcon: svgString, iconScale: 0.5 }
    const params2 = { ...defaultStampParams, contentType: 'svg' as const, svgIcon: svgString, iconScale: 1.0 }

    const result1 = buildStamp({ params: params1, font: null })
    const result2 = buildStamp({ params: params2, font: null })

    result1.icon!.computeBoundingBox()
    result2.icon!.computeBoundingBox()
    const size1 = result1.icon!.boundingBox!.max.x - result1.icon!.boundingBox!.min.x
    const size2 = result2.icon!.boundingBox!.max.x - result2.icon!.boundingBox!.min.x

    expect(size2).toBeGreaterThan(size1)
  })
})
