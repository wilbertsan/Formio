import { describe, it, expect } from 'vitest'
import { Font, type FontData } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildCutterStamp } from '@/features/studio/tools/confeitaria/cortador-carimbo/buildCutterStamp'
import { defaultCutterStampParams } from '@/features/studio/tools/confeitaria/cortador-carimbo/schema'

const mockGlyph = { ha: 400, x_min: 0, x_max: 400, o: 'm 0 0 l 400 0 l 400 100 l 0 100 z', offsetX: 0 }

const mockFontData: FontData = {
  glyphs: {
    T: { ...mockGlyph, ha: 600, x_max: 600 },
    t: { ...mockGlyph },
    e: { ...mockGlyph },
    s: { ...mockGlyph },
    P: { ...mockGlyph, ha: 600, x_max: 600 },
    a: { ...mockGlyph },
    r: { ...mockGlyph, ha: 300, x_max: 300 },
    b: { ...mockGlyph },
    'é': { ...mockGlyph },
    n: { ...mockGlyph },
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

describe('buildCutterStamp - wall', () => {
  it('builds circle wall geometry', () => {
    const params = { ...defaultCutterStampParams, outerShape: 'circle' as const }
    const result = buildCutterStamp({ params, font: null })
    expect(result.wall).toBeDefined()
    expect(result.wall.attributes.position).toBeDefined()
  })

  it('builds rectangle wall geometry', () => {
    const params = { ...defaultCutterStampParams, outerShape: 'rectangle' as const }
    const result = buildCutterStamp({ params, font: null })
    expect(result.wall).toBeDefined()
    expect(result.wall.attributes.position).toBeDefined()
  })

  it('builds star wall geometry', () => {
    const params = { ...defaultCutterStampParams, outerShape: 'star' as const }
    const result = buildCutterStamp({ params, font: null })
    expect(result.wall).toBeDefined()
    expect(result.wall.attributes.position).toBeDefined()
  })

  it('wall height matches wallHeight parameter', () => {
    const params = { ...defaultCutterStampParams, wallHeight: 30 }
    const result = buildCutterStamp({ params, font: null })
    result.wall.computeBoundingBox()
    const bb = result.wall.boundingBox!
    const height = bb.max.z - bb.min.z
    expect(height).toBeCloseTo(30, 0)
  })

  it('wall thickness is reflected in bounding box', () => {
    const params = { ...defaultCutterStampParams, wallThickness: 1.5 }
    const result = buildCutterStamp({ params, font: null })
    result.wall.computeBoundingBox()
    const bb = result.wall.boundingBox!
    const sizeX = bb.max.x - bb.min.x
    const sizeY = bb.max.y - bb.min.y
    // Size should be diameter + 2*thickness for circle
    expect(sizeX).toBeGreaterThan(params.diameter)
    expect(sizeY).toBeGreaterThan(params.diameter)
  })
})

describe('buildCutterStamp - null text', () => {
  it('returns null text when font is null', () => {
    const result = buildCutterStamp({ params: defaultCutterStampParams, font: null })
    expect(result.text).toBeNull()
  })

  it('returns null centralShape when centralShape is null', () => {
    const result = buildCutterStamp({ params: defaultCutterStampParams, font: null })
    expect(result.centralShape).toBeNull()
  })
})

describe('buildCutterStamp - text', () => {
  const mockFont = new Font(mockFontData)

  it('builds text geometry when font is provided', () => {
    const params = { ...defaultCutterStampParams, text: 'Teste' }
    const result = buildCutterStamp({ params, font: mockFont })
    expect(result.text).toBeDefined()
    expect(result.text).not.toBeNull()
  })

  it('text is positioned at stamp height from top', () => {
    const params = { ...defaultCutterStampParams, text: 'Teste', wallHeight: 25, stampHeight: 10 }
    const result = buildCutterStamp({ params, font: mockFont })
    if (result.text) {
      result.text.computeBoundingBox()
      const bb = result.text.boundingBox!
      // Text should start at wallHeight - stampHeight
      expect(bb.min.z).toBeCloseTo(params.wallHeight - params.stampHeight, 0)
    }
  })
})

describe('buildCutterStamp - central shapes', () => {
  it('builds circle central shape', () => {
    const params = { ...defaultCutterStampParams, centralShape: 'circle' as const }
    const result = buildCutterStamp({ params, font: null })
    expect(result.centralShape).toBeDefined()
    expect(result.centralShape).not.toBeNull()
  })

  it('builds star central shape', () => {
    const params = { ...defaultCutterStampParams, centralShape: 'star' as const }
    const result = buildCutterStamp({ params, font: null })
    expect(result.centralShape).toBeDefined()
    expect(result.centralShape).not.toBeNull()
  })

  it('builds heart central shape', () => {
    const params = { ...defaultCutterStampParams, centralShape: 'heart' as const }
    const result = buildCutterStamp({ params, font: null })
    expect(result.centralShape).toBeDefined()
    expect(result.centralShape).not.toBeNull()
  })

  it('central shape is positioned at stamp height from top', () => {
    const params = { ...defaultCutterStampParams, centralShape: 'circle' as const, wallHeight: 25, stampHeight: 10 }
    const result = buildCutterStamp({ params, font: null })
    if (result.centralShape) {
      result.centralShape.computeBoundingBox()
      const bb = result.centralShape.boundingBox!
      expect(bb.min.z).toBeCloseTo(params.wallHeight - params.stampHeight, 0)
    }
  })
})

describe('buildCutterStamp - combined content', () => {
  const mockFont = new Font(mockFontData)

  it('builds both text and central shape when both provided', () => {
    const params = {
      ...defaultCutterStampParams,
      text: 'Teste',
      centralShape: 'circle' as const,
    }
    const result = buildCutterStamp({ params, font: mockFont })
    expect(result.text).not.toBeNull()
    expect(result.centralShape).not.toBeNull()
  })
})
