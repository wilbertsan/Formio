import { describe, it, expect } from 'vitest'
import { buildCakeTopper } from '@/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper'
import { defaultCakeTopperParams } from '@/features/studio/tools/confeitaria/topo-bolo/schema'
import { Font, type FontData } from 'three/examples/jsm/loaders/FontLoader.js'

describe('buildCakeTopper - plate', () => {
  it('builds circle plate', () => {
    const params = { ...defaultCakeTopperParams, shape: 'circle' as const }
    const result = buildCakeTopper({ params, font: null })
    expect(result.plate).toBeDefined()
    expect(result.plate.attributes.position).toBeDefined()
  })

  it('builds rectangle plate', () => {
    const params = { ...defaultCakeTopperParams, shape: 'rectangle' as const }
    const result = buildCakeTopper({ params, font: null })
    expect(result.plate).toBeDefined()
  })

  it('builds oval plate', () => {
    const params = { ...defaultCakeTopperParams, shape: 'oval' as const }
    const result = buildCakeTopper({ params, font: null })
    expect(result.plate).toBeDefined()
  })
})

describe('buildCakeTopper - leg', () => {
  it('builds trapezoidal leg', () => {
    const params = { ...defaultCakeTopperParams }
    const result = buildCakeTopper({ params, font: null })
    expect(result.leg).toBeDefined()
    expect(result.leg!.attributes.position).toBeDefined()
  })

  it('leg is positioned below plate', () => {
    const params = { ...defaultCakeTopperParams, legHeight: 40 }
    const result = buildCakeTopper({ params, font: null })
    result.leg!.computeBoundingBox()
    const bb = result.leg!.boundingBox!
    expect(bb.max.z).toBeCloseTo(0, 1)
    expect(bb.min.z).toBeCloseTo(-40, 1)
  })
})

describe('buildCakeTopper - text', () => {
  it('builds text geometry when font is provided', () => {
    const params = { ...defaultCakeTopperParams, text: 'T' }
    const mockFontData: FontData = {
      glyphs: {
        T: { ha: 600, x_min: 0, x_max: 600, o: 'm 0 0 l 600 0 l 600 100 l 0 100 z' },
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
    const mockFont = new Font(mockFontData)
    const result = buildCakeTopper({ params, font: mockFont })
    expect(result.text).toBeDefined()
    expect(result.text).not.toBeNull()
  })

  it('returns null text when font is null', () => {
    const params = { ...defaultCakeTopperParams }
    const result = buildCakeTopper({ params, font: null })
    expect(result.text).toBeNull()
  })
})
