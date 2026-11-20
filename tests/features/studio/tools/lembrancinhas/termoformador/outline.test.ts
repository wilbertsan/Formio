import { describe, it, expect } from 'vitest'
import {
  getShapeOutline,
  offsetOutlinePaths,
  pointInPaths,
} from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
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
    expect(outline.cavityOpening).not.toBeNull()
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
