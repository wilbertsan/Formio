import { describe, it, expect } from 'vitest'
import { buildScreen } from '@/features/studio/tools/lembrancinhas/termoformador/buildScreen'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { computeScreenPattern } from '@/features/studio/tools/lembrancinhas/termoformador/screenPattern'
import {
  MAX_SCREEN_OPENINGS,
  defaultThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildScreen', () => {
  it('ocupa o diâmetro, a espessura e fica deitada na mesa', () => {
    const params = defaultThermoformerParams
    const outline = getShapeOutline(params)!
    const geometry = buildScreen(params, outline)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.x).toBeCloseTo(-params.diameter / 2, 1)
    expect(box.max.x).toBeCloseTo(params.diameter / 2, 1)
    expect(box.min.z).toBeCloseTo(-params.diameter / 2, 1)
    expect(box.max.z).toBeCloseTo(params.diameter / 2, 1)
    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(params.thickness, 3)
    geometry.dispose()
  })

  it('gera malha fechada e com volume positivo', () => {
    const params = defaultThermoformerParams
    const geometry = buildScreen(params, getShapeOutline(params)!)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('os favos aumentam a contagem de vértices', () => {
    const solidParams = {
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 30,
      opening: 30,
    }
    const withCells = buildScreen(
      defaultThermoformerParams,
      getShapeOutline(defaultThermoformerParams)!,
    )
    const solid = buildScreen(solidParams, getShapeOutline(solidParams)!)

    expect(computeScreenPattern(defaultThermoformerParams).cells.length).toBeGreaterThan(0)
    expect(computeScreenPattern({ ...defaultThermoformerParams, diameter: 60, frameWidth: 30 }).cells).toHaveLength(0)
    expect(withCells.getAttribute('position').count)
      .toBeGreaterThan(solid.getAttribute('position').count)

    withCells.dispose()
    solid.dispose()
  })

  it('spike: malha densa (~1.800 favos) permanece fechada', () => {
    const params = {
      ...defaultThermoformerParams,
      diameter: 160,
      frameWidth: 2,
      opening: 3,
      lineWidth: 0.4,
    }
    const pattern = computeScreenPattern(params)
    expect(pattern.cells.length).toBeGreaterThan(1500)
    expect(pattern.cells.length).toBeLessThanOrEqual(MAX_SCREEN_OPENINGS)

    const geometry = buildScreen(params, getShapeOutline(params)!)
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })

  it('gera tela quadrada fechada e no tamanho correto', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const geometry = buildScreen(params, outline)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.min.x).toBeCloseTo(-60, 0)
    expect(geometry.boundingBox!.max.x).toBeCloseTo(60, 0)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('gera tela retangular e de pirâmide', () => {
    for (const shape of ['rectangle', 'pyramid'] as const) {
      const params = { ...defaultThermoformerParams, shape, width: 120, height: 80 }
      const outline = getShapeOutline(params)!
      const geometry = buildScreen(params, outline)
      expect(isClosed(geometry)).toBe(true)
      expect(signedVolume(geometry)).toBeGreaterThan(0)
      geometry.dispose()
    }
  })

  it('gera tela SVG fechada', () => {
    const triangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="50,5 95,95 5,95" fill="#000"/>
    </svg>`
    const parsed = parseSvg(triangle)!
    const params = {
      ...defaultThermoformerParams,
      shape: 'svg' as const,
      svgSize: 100,
      svg: triangle,
    }
    const outline = getShapeOutline(params, parsed)!
    const geometry = buildScreen(params, outline)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })
})
