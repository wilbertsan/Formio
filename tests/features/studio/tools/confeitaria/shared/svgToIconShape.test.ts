import { describe, it, expect } from 'vitest'
import { Box2, type BufferGeometry } from 'three'
import {
  svgBounds,
  svgToShapes,
  buildSvgIconGeometry,
  buildSvgIconGeometryInBox,
  buildSvgIconGeometryFromParsed,
  buildSvgIconGeometryInBoxFromParsed,
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

describe('buildSvgIconGeometryFromParsed', () => {
  it('gera geometria a partir de ParsedSvg', () => {
    const parsed = parseSvg(SVG_RECT)!
    const geo = buildSvgIconGeometryFromParsed(parsed, {
      maxRadius: 10, lineWidth: 0.3, iconScale: 1, depth: 1,
    })
    expect(geo).not.toBeNull()
    const { w, h } = measure(geo!)
    expect(Math.max(w, h)).toBeGreaterThan(15)
    expect(Math.max(w, h)).toBeLessThanOrEqual(20.1)
  })

  it('retorna null para ParsedSvg vazio', () => {
    expect(buildSvgIconGeometryFromParsed(
      { fills: [], strokes: [] },
      { maxRadius: 10, lineWidth: 0.3, iconScale: 1, depth: 1 },
    )).toBeNull()
  })

  it('equivale à variante por string', () => {
    const input = { maxRadius: 10, lineWidth: 0.3, iconScale: 1, depth: 1 }
    const fromParsed = buildSvgIconGeometryFromParsed(parseSvg(SVG_RECT)!, input)!
    const fromString = buildSvgIconGeometry({ svg: SVG_RECT, ...input })!
    fromParsed.computeBoundingBox()
    fromString.computeBoundingBox()
    const a = fromParsed.boundingBox!
    const b = fromString.boundingBox!
    expect(a.min.x).toBeCloseTo(b.min.x, 3)
    expect(a.min.y).toBeCloseTo(b.min.y, 3)
    expect(a.min.z).toBeCloseTo(b.min.z, 3)
    expect(a.max.x).toBeCloseTo(b.max.x, 3)
    expect(a.max.y).toBeCloseTo(b.max.y, 3)
    expect(a.max.z).toBeCloseTo(b.max.z, 3)
  })
})

function measure(geo: BufferGeometry): { w: number; h: number; minZ: number } {
  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  return { w: bb.max.x - bb.min.x, h: bb.max.y - bb.min.y, minZ: bb.min.z }
}

describe('buildSvgIconGeometryInBoxFromParsed', () => {
  it('encaixa em caixa a partir de ParsedSvg', () => {
    const parsed = parseSvg(SVG_RECT)!
    const geo = buildSvgIconGeometryInBoxFromParsed(parsed, {
      maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1,
    })
    expect(geo).not.toBeNull()
    const { w, h } = measure(geo!)
    const max = Math.max(w, h)
    expect(max).toBeGreaterThan(18)
    expect(max).toBeLessThanOrEqual(20.1)
    expect(Math.abs(w / h - 2)).toBeLessThan(0.5)
  })

  it('retorna null para ParsedSvg vazio', () => {
    expect(buildSvgIconGeometryInBoxFromParsed(
      { fills: [], strokes: [] },
      { maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1 },
    )).toBeNull()
  })

  it('equivale à variante por string', () => {
    const input = { maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1 }
    const fromParsed = buildSvgIconGeometryInBoxFromParsed(parseSvg(SVG_RECT)!, input)!
    const fromString = buildSvgIconGeometryInBox({ svg: SVG_RECT, ...input })!
    fromParsed.computeBoundingBox()
    fromString.computeBoundingBox()
    const a = fromParsed.boundingBox!
    const b = fromString.boundingBox!
    expect(a.min.x).toBeCloseTo(b.min.x, 3)
    expect(a.min.y).toBeCloseTo(b.min.y, 3)
    expect(a.min.z).toBeCloseTo(b.min.z, 3)
    expect(a.max.x).toBeCloseTo(b.max.x, 3)
    expect(a.max.y).toBeCloseTo(b.max.y, 3)
    expect(a.max.z).toBeCloseTo(b.max.z, 3)
  })
})

describe('buildSvgIconGeometryInBox', () => {
  it('encaixa o ícone em uma caixa com proporção', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="50" fill="#000"/></svg>`
    const geo = buildSvgIconGeometryInBox({
      svg, maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1,
    })
    expect(geo).not.toBeNull()
    const { w, h } = measure(geo!)
    expect(w).toBeLessThanOrEqual(20.1)
    expect(h).toBeLessThanOrEqual(20.1)
    expect(Math.max(w, h)).toBeGreaterThan(15)
  })

  it('respeita o eixo mais restritivo (altura)', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="50" height="100" fill="#000"/></svg>`
    const geo = buildSvgIconGeometryInBox({
      svg, maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1,
    })
    expect(geo).not.toBeNull()
    const { w, h } = measure(geo!)
    expect(h).toBeLessThanOrEqual(20.1)
    expect(w).toBeLessThan(h)
  })

  it('retorna null para svg vazio', () => {
    expect(buildSvgIconGeometryInBox({
      svg: SVG_EMPTY, maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1,
    })).toBeNull()
  })

  it('aplica iconScale proporcionalmente', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="50" fill="#000"/></svg>`
    const full = buildSvgIconGeometryInBox({
      svg, maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1,
    })!
    const half = buildSvgIconGeometryInBox({
      svg, maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 0.5, depth: 1,
    })!
    const fullMax = Math.max(measure(full).w, measure(full).h)
    const halfMax = Math.max(measure(half).w, measure(half).h)
    expect(halfMax / fullMax).toBeCloseTo(0.5, 1)
  })

  it('considera a largura declarada de traços largos', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><polyline points="0,0 100,10" stroke="#000" stroke-width="10" fill="none"/></svg>`
    const geo = buildSvgIconGeometryInBox({
      svg, maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1,
    })
    expect(geo).not.toBeNull()
    const { w, h } = measure(geo!)
    expect(w).toBeLessThanOrEqual(20.1)
    expect(h).toBeLessThanOrEqual(20.1)
  })

  it('aceita ícone com altura zero', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="100" y2="0" stroke="#000" stroke-width="2"/></svg>`
    const geo = buildSvgIconGeometryInBox({
      svg, maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1,
    })
    expect(geo).not.toBeNull()
    const { w } = measure(geo!)
    expect(w).toBeLessThanOrEqual(20.1)
  })

  it('normaliza a base da extrusão em Z = 0', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="50" fill="#000"/></svg>`
    const geo = buildSvgIconGeometryInBox({
      svg, maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1,
    })
    expect(geo).not.toBeNull()
    expect(measure(geo!).minZ).toBeCloseTo(0, 3)
  })
})
