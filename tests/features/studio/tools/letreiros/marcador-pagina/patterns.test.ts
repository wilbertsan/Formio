import { defaultBookmarkParams } from '@/features/studio/tools/letreiros/marcador-pagina/schema'
import {
  motifShapes,
  buildPatternShapes,
  buildPatternGeometry,
} from '@/features/studio/tools/letreiros/marcador-pagina/patterns'
import { splitBaseCenterX } from '@/features/studio/tools/letreiros/marcador-pagina/joint'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

const SVG_RECT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><rect x="10" y="5" width="80" height="30" fill="#000"/></svg>'

describe('motifShapes', () => {
  it('cria um motivo para cada geometria', () => {
    for (const type of ['triangles', 'squares', 'circles', 'diamonds'] as const) {
      const shapes = motifShapes(type)
      expect(shapes).toHaveLength(1)
      expect(shapes[0].outer.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('retorna vazio para none e svg', () => {
    expect(motifShapes('none')).toHaveLength(0)
    expect(motifShapes('svg')).toHaveLength(0)
  })
})

describe('buildPatternShapes', () => {
  it('retorna vazio quando a textura está desligada', () => {
    expect(buildPatternShapes(defaultBookmarkParams, null)).toHaveLength(0)
  })

  it('preenche a base com triângulos', () => {
    const params = {
      ...defaultBookmarkParams,
      pattern: { ...defaultBookmarkParams.pattern, type: 'triangles' as const },
    }
    const shapes = buildPatternShapes(params, null)
    expect(shapes.length).toBeGreaterThan(0)

    const xs = shapes.flatMap((shape) => shape.getPoints().map((p) => p.x))
    const baseCenterX = splitBaseCenterX(params.width)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(baseCenterX - params.width / 2)
    expect(Math.max(...xs)).toBeLessThanOrEqual(-2.2)
  })

  it('gera textura a partir de um SVG', () => {
    const params = {
      ...defaultBookmarkParams,
      pattern: { ...defaultBookmarkParams.pattern, type: 'svg' as const, svg: SVG_RECT },
    }
    const shapes = buildPatternShapes(params, parseSvg(SVG_RECT))
    expect(shapes.length).toBeGreaterThan(0)
  })

  it('não quebra quando o SVG é inválido', () => {
    const params = {
      ...defaultBookmarkParams,
      pattern: { ...defaultBookmarkParams.pattern, type: 'svg' as const },
    }
    expect(buildPatternShapes(params, null)).toHaveLength(0)
  })
})

describe('buildPatternGeometry', () => {
  it('retorna null quando não há textura', () => {
    expect(buildPatternGeometry(defaultBookmarkParams, null)).toBeNull()
  })

  it('cria relevo acima do topo da base', () => {
    const params = {
      ...defaultBookmarkParams,
      pattern: { ...defaultBookmarkParams.pattern, type: 'circles' as const, depth: 0.8 },
    }
    const geometry = buildPatternGeometry(params, null)!
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.min.z).toBeLessThan(params.thickness)
    expect(box.max.z).toBeCloseTo(params.thickness + 0.8, 2)
  })

  it('profundidade maior eleva mais o relevo', () => {
    const base = {
      ...defaultBookmarkParams,
      pattern: { ...defaultBookmarkParams.pattern, type: 'squares' as const },
    }
    const low = buildPatternGeometry(
      { ...base, pattern: { ...base.pattern, depth: 0.4 } },
      null,
    )!
    const high = buildPatternGeometry(
      { ...base, pattern: { ...base.pattern, depth: 1.5 } },
      null,
    )!
    low.computeBoundingBox()
    high.computeBoundingBox()
    expect(high.boundingBox!.max.z).toBeGreaterThan(low.boundingBox!.max.z)
  })
})
