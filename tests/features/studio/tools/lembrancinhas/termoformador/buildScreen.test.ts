import { describe, it, expect } from 'vitest'
import { buildScreen } from '@/features/studio/tools/lembrancinhas/termoformador/buildScreen'
import { computeScreenPattern } from '@/features/studio/tools/lembrancinhas/termoformador/screenPattern'
import {
  MAX_SCREEN_OPENINGS,
  defaultThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildScreen', () => {
  it('ocupa o diâmetro, a espessura e fica deitada na mesa', () => {
    const params = defaultThermoformerParams
    const geometry = buildScreen(params)
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
    const geometry = buildScreen(defaultThermoformerParams)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('os favos aumentam a contagem de vértices', () => {
    const withCells = buildScreen(defaultThermoformerParams)
    const solid = buildScreen({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 30,
      opening: 30,
    })

    expect(computeScreenPattern(defaultThermoformerParams).cells.length).toBeGreaterThan(0)
    expect(computeScreenPattern({ ...defaultThermoformerParams, diameter: 60, frameWidth: 30 }).cells).toHaveLength(0)
    expect(withCells.getAttribute('position').count)
      .toBeGreaterThan(solid.getAttribute('position').count)

    withCells.dispose()
    solid.dispose()
  })

  it('spike: malha densa (~1.200 favos) permanece fechada', () => {
    const params = {
      ...defaultThermoformerParams,
      diameter: 160,
      frameWidth: 2,
      opening: 3,
      lineWidth: 1.2,
    }
    const pattern = computeScreenPattern(params)
    expect(pattern.cells.length).toBeGreaterThan(1000)
    expect(pattern.cells.length).toBeLessThanOrEqual(MAX_SCREEN_OPENINGS)

    const geometry = buildScreen(params)
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })
})
