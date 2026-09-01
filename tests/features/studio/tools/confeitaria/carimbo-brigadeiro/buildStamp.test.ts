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
    const result = buildStamp({ params: defaultStampParams, font: mockFont })
    
    if (result.text) {
      result.text.computeBoundingBox()
      const bb = result.text.boundingBox!
      const depth = bb.max.z - bb.min.z
      expect(depth).toBeCloseTo(1.2, 0)
    }
  })
})

describe('buildStamp - icon', () => {
  it('builds icon geometry when svgIcon is provided', () => {
    const svgString = '<svg><circle cx="10" cy="10" r="5"/></svg>'
    const params = { ...defaultStampParams, svgIcon: svgString }
    const result = buildStamp({ params, font: null })
    
    expect(result.icon).toBeDefined()
    expect(result.icon).not.toBeNull()
  })

  it('returns null for icon when svgIcon is null', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.icon).toBeNull()
  })

  it('icon is scaled by iconScale parameter', () => {
    const svgString = '<svg><circle cx="10" cy="10" r="5"/></svg>'
    const params1 = { ...defaultStampParams, svgIcon: svgString, iconScale: 1.0 }
    const params2 = { ...defaultStampParams, svgIcon: svgString, iconScale: 2.0 }
    
    const result1 = buildStamp({ params: params1, font: null })
    const result2 = buildStamp({ params: params2, font: null })
    
    if (result1.icon && result2.icon) {
      result1.icon.computeBoundingBox()
      result2.icon.computeBoundingBox()
      
      const size1 = result1.icon.boundingBox!.max.x - result1.icon.boundingBox!.min.x
      const size2 = result2.icon.boundingBox!.max.x - result2.icon.boundingBox!.min.x
      
      expect(size2).toBeGreaterThan(size1)
    }
  })
})
