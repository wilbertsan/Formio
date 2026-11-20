import { describe, it, expect } from 'vitest'
import { ShapeUtils } from 'three'
import {
  parseSvg,
  svgRawShapesFromParsed,
} from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import {
  getSvgScreenPoints,
  inspectSvgSilhouette,
} from '@/features/studio/tools/lembrancinhas/termoformador/svgOutline'

interface Point2D {
  x: number
  y: number
}

interface ScreenBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
  centerX: number
  centerY: number
}

function screenBounds(points: Point2D[]): ScreenBounds {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

const triangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,5 95,95 5,95" fill="#000"/>
</svg>`

const rectangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100">
  <rect x="10" y="25" width="100" height="50" fill="#000"/>
</svg>`

const strokeLine = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <line x1="5" y1="50" x2="95" y2="50" stroke="#000" stroke-width="40"/>
</svg>`

const islands = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="5" y="5" width="30" height="30" fill="#000"/>
  <rect x="65" y="65" width="30" height="30" fill="#000"/>
</svg>`

const donut = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M50 5A45 45 0 1 0 50 95A45 45 0 1 0 50 5Z M50 25A25 25 0 1 1 50 75A25 25 0 1 1 50 25Z" fill="#000"/>
</svg>`

// Ambos os subpaths giram no mesmo sentido (sweep 0). O loader preserva o furo,
// mas com a mesma orientação do contorno externo, como no `fill-rule="evenodd"`.
const evenOdd = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path fill-rule="evenodd" d="M50 5A45 45 0 1 0 50 95A45 45 0 1 0 50 5Z M50 25A25 25 0 1 0 50 75A25 25 0 1 0 50 25Z" fill="#000"/>
</svg>`

describe('svgOutline', () => {
  it('escala pela maior dimensão, centraliza e inverte o eixo Y', () => {
    const parsed = parseSvg(triangle)!
    const result = inspectSvgSilhouette(parsed, 100)
    expect(result.error).toBeNull()
    const points = result.points!
    const bounds = screenBounds(points)

    expect(bounds.width).toBeCloseTo(100, 0)
    expect(bounds.height).toBeCloseTo(100, 0)
    expect(bounds.centerX).toBeCloseTo(0, 5)
    expect(bounds.centerY).toBeCloseTo(0, 5)

    // O ápice (50,5) fica no topo do SVG; após o flip, o topo vira y positivo.
    const apex = points.find((point) => Math.abs(point.y - 50) < 1)
    expect(apex).toBeDefined()
    expect(Math.abs(apex!.x)).toBeLessThan(1)
    expect(bounds.minY).toBeCloseTo(-50, 0)
    expect(bounds.maxY).toBeCloseTo(50, 0)
  })

  it('getSvgScreenPoints devolve a mesma silhueta', () => {
    const parsed = parseSvg(triangle)!
    const points = getSvgScreenPoints(parsed, 100)!
    expect(screenBounds(points).width).toBeCloseTo(100, 0)
    expect(screenBounds(points).height).toBeCloseTo(100, 0)
  })

  it('preserva a proporção de um retângulo não quadrado', () => {
    const parsed = parseSvg(rectangle)!
    const points = getSvgScreenPoints(parsed, 100)!
    const bounds = screenBounds(points)

    expect(bounds.width).toBeCloseTo(100, 1)
    expect(bounds.height).toBeCloseTo(50, 1)
    expect(bounds.centerX).toBeCloseTo(0, 5)
    expect(bounds.centerY).toBeCloseTo(0, 5)
  })

  it('escala traço pelo contorno unido, não pela linha central', () => {
    const parsed = parseSvg(strokeLine)!
    const points = getSvgScreenPoints(parsed, 100)!
    const bounds = screenBounds(points)

    // O contorno do traço tem 130 x 40 (90 da linha + 20 de cada ponta). A
    // linha central mediria 90 e inflaria a largura para 144,4.
    expect(bounds.width).toBeCloseTo(100, 1)
    expect(bounds.height).toBeCloseTo(30.77, 1)
    expect(bounds.centerX).toBeCloseTo(0, 5)
    expect(bounds.centerY).toBeCloseTo(0, 5)
  })

  it('rejeita ilhas desconexas', () => {
    const parsed = parseSvg(islands)!
    const result = inspectSvgSilhouette(parsed, 100)
    expect(result.points).toBeNull()
    expect(result.error).toBe('contour')
  })

  it('rejeita svg vazio', () => {
    const result = inspectSvgSilhouette({ fills: [], strokes: [] }, 100)
    expect(result.points).toBeNull()
    expect(result.error).toBe('empty')
  })

  it('rejeita furo com orientação oposta', () => {
    const parsed = parseSvg(donut)!
    const result = inspectSvgSilhouette(parsed, 100)
    expect(result.points).toBeNull()
    expect(result.error).toBe('contour')
  })

  it('rejeita furo com a mesma orientação (even-odd)', () => {
    const parsed = parseSvg(evenOdd)!
    const [raw] = svgRawShapesFromParsed(parsed)
    const outerSign = Math.sign(ShapeUtils.area(raw.getPoints()))
    expect(raw.holes).toHaveLength(1)
    expect(Math.sign(ShapeUtils.area(raw.holes[0].getPoints()))).toBe(outerSign)

    const result = inspectSvgSilhouette(parsed, 100)
    expect(result.points).toBeNull()
    expect(result.error).toBe('contour')
  })
})
