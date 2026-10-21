import { describe, it, expect } from 'vitest'
import { Box2 } from 'three'
import {
  svgBounds,
  svgToShapes,
  buildSvgIconGeometry,
  parseSvg,
  svgBoundsFromParsed,
  svgShapesFromParsed,
  svgRawShapesFromParsed,
} from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

const SVG_RECT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'
const SVG_STROKE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><line x1="1" y1="5" x2="19" y2="5" stroke="#000" stroke-width="0.5"/></svg>'
const SVG_EMPTY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"></svg>'
const SVG_CIRCLE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#000"/></svg>'

describe('parseSvg (main thread)', () => {
  it('achata fills e strokes em dados serializáveis', () => {
    const parsed = parseSvg(SVG_RECT)!
    expect(parsed.fills.length).toBeGreaterThan(0)
    expect(parsed.fills[0].outer.length).toBeGreaterThan(0)

    const strokeParsed = parseSvg(SVG_STROKE)!
    expect(strokeParsed.strokes.length).toBeGreaterThan(0)
  })

  it('retorna null para svg sem formas', () => {
    expect(parseSvg(SVG_EMPTY)).toBeNull()
  })

  it('aumenta a resolução das curvas quando solicitado', () => {
    const low = parseSvg(SVG_CIRCLE, 8)!
    const high = parseSvg(SVG_CIRCLE, 32)!
    expect(high.fills[0].outer.length).toBeGreaterThan(low.fills[0].outer.length)
  })

  it('preserva a espessura original do traço do SVG', () => {
    const parsed = {
      fills: [],
      strokes: [{ points: [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }], width: 0.25 }],
    }
    const shape = svgRawShapesFromParsed(parsed)[0]
    const box = new Box2().setFromPoints(shape.getPoints())
    expect(box.max.x - box.min.x).toBeCloseTo(0.25, 2)
  })
})

describe('svgBoundsFromParsed / svgShapesFromParsed (worker-safe)', () => {
  it('calcula bounds e constrói shapes sem DOM', () => {
    const parsed = parseSvg(SVG_RECT)!
    const bounds = svgBoundsFromParsed(parsed)!
    expect(bounds.height).toBeCloseTo(10, 1)
    expect(svgShapesFromParsed(parsed, 0.3).length).toBeGreaterThan(0)
  })
})

describe('svgBounds', () => {
  it('retorna dimensões e raio do svg', () => {
    const bounds = svgBounds(SVG_RECT)!
    expect(bounds.width).toBeGreaterThan(0)
    expect(bounds.height).toBeGreaterThan(0)
    expect(bounds.farthest).toBeGreaterThan(0)
  })

  it('retorna null para svg vazio', () => {
    expect(svgBounds(SVG_EMPTY)).toBeNull()
  })
})

describe('svgToShapes', () => {
  it('gera shapes a partir de fills', () => {
    expect(svgToShapes(SVG_RECT, 0.3).length).toBeGreaterThan(0)
  })

  it('gera shapes a partir de strokes', () => {
    expect(svgToShapes(SVG_STROKE, 0.3).length).toBeGreaterThan(0)
  })

  it('retorna vazio para svg sem paths', () => {
    expect(svgToShapes(SVG_EMPTY, 0.3)).toEqual([])
  })
})

describe('buildSvgIconGeometry', () => {
  it('gera geometria de um svg preenchido', () => {
    const geometry = buildSvgIconGeometry({ svg: SVG_RECT, maxRadius: 5, lineWidth: 0.3, iconScale: 1, depth: 1 })
    expect(geometry).not.toBeNull()
    expect(geometry!.attributes.position).toBeDefined()
  })

  it('retorna null para svg sem paths', () => {
    expect(buildSvgIconGeometry({ svg: SVG_EMPTY, maxRadius: 5, lineWidth: 0.3, iconScale: 1, depth: 1 })).toBeNull()
  })
})
