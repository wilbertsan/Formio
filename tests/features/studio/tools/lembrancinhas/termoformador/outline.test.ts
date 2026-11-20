import { describe, it, expect } from 'vitest'
import {
  getShapeOutline,
  offsetOutlinePaths,
  pointInPaths,
} from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { pathsBoundingBox } from '@/features/studio/tools/confeitaria/shared/textOutline'

describe('getShapeOutline', () => {
  it('cria o contorno circular atual', () => {
    const outline = getShapeOutline(defaultThermoformerParams)
    expect(outline).not.toBeNull()
    expect(outline!.kind).toBe('circle')
    expect(outline!.radius).toBeCloseTo(80, 5)
    expect(outline!.bounds.width).toBeCloseTo(160, 1)
  })

  it('cria quadrado com moldura, rebaixo e suporte', () => {
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'square',
      width: 120,
    })!
    const outer = pathsBoundingBox(outline.supportOuter!)
    const recess = pathsBoundingBox(outline.recess!)
    const perforated = pathsBoundingBox(outline.perforated!)

    expect(outer.width).toBeCloseTo(120 + 2 * (0.3 + 4), 1)
    expect(recess.width).toBeCloseTo(120 + 2 * 0.3, 1)
    expect(perforated.width).toBeCloseTo(120 - 2 * 6, 1)
    const opening = pathsBoundingBox(outline.cavityOpening!)
    expect(opening.width).toBeCloseTo(120 - 2 * 6, 1)
    expect(opening.height).toBeCloseTo(120 - 2 * 6, 1)
  })

  it('deriva o degrau efetivo da moldura e da folga', () => {
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'rectangle',
      width: 140,
      height: 80,
    })!
    const perforated = pathsBoundingBox(outline.perforated!)
    const opening = pathsBoundingBox(outline.cavityOpening!)
    expect(opening.width).toBeCloseTo(perforated.width, 1)
    expect(opening.height).toBeCloseTo(perforated.height, 1)
  })

  it('aceita pirâmide de base quadrada', () => {
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'pyramid',
      width: 120,
    })!
    expect(outline.kind).toBe('polygon')
    expect(outline.bounds.width).toBeCloseTo(120, 1)
  })

  it('usa o degrau pedido quando ele cobre a moldura', () => {
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'square',
      width: 140,
      stepWidth: 10,
    })!
    expect(outline.effectiveStep).toBeCloseTo(10, 5)
    expect(pathsBoundingBox(outline.cavityOpening!).width).toBeCloseTo(140 - 2 * (10 - 0.3), 1)
  })

  it('monta o contorno SVG e retorna null sem o parse', () => {
    const triangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="50,5 95,95 5,95" fill="#000"/>
    </svg>`
    const parsed = parseSvg(triangle)!
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'svg',
      svgSize: 100,
      svg: triangle,
    }, parsed)!
    expect(outline.kind).toBe('polygon')
    expect(outline.join).toBe('round')
    expect(outline.bounds.width).toBeCloseTo(100, 0)
    expect(getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'svg',
      svgSize: 100,
      svg: triangle,
    })).toBeNull()
  })
})

describe('offsetOutlinePaths', () => {
  it('cresce e encolhe mantendo o contorno', () => {
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'square',
      width: 100,
    })!
    const grown = offsetOutlinePaths(outline.paths!, 5, 'miter')
    const shrunk = offsetOutlinePaths(outline.paths!, -5, 'miter')
    expect(pathsBoundingBox(grown).width).toBeCloseTo(110, 1)
    expect(pathsBoundingBox(shrunk).width).toBeCloseTo(90, 1)
    // Um canto reto em -55, -55 prova que o join é miter, não round.
    expect(grown[0].some((point) =>
      point.X === -55000 && point.Y === -55000,
    )).toBe(true)
  })

  it('pointInPaths reconhece dentro e fora', () => {
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'square',
      width: 100,
    })!
    expect(pointInPaths(0, 0, outline.perforated!)).toBe(true)
    expect(pointInPaths(0, 100, outline.perforated!)).toBe(false)
  })
})
