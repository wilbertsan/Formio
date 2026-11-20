import { describe, it, expect } from 'vitest'
import { computeScreenPattern } from '@/features/studio/tools/lembrancinhas/termoformador/screenPattern'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import {
  MAX_SCREEN_OPENINGS,
  defaultThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('computeScreenPattern', () => {
  it('gera favos dentro do raio interno por padrão', () => {
    const pattern = computeScreenPattern(defaultThermoformerParams)
    expect(pattern.cells.length).toBeGreaterThan(0)
    expect(pattern.capped).toBe(false)
    expect(pattern.innerRadius).toBeCloseTo(74, 5)
    expect(pattern.cellRadius).toBeCloseTo(6 / Math.sqrt(3), 5)
    expect(pattern.spacing).toBeCloseTo(6.4, 5)

    for (const cell of pattern.cells) {
      expect(Math.hypot(cell.x, cell.y) + cell.radius).toBeLessThanOrEqual(
        pattern.innerRadius! + 1e-6,
      )
    }
  })

  it('mantém a linha de 0,4 mm entre favos vizinhos', () => {
    const pattern = computeScreenPattern(defaultThermoformerParams)
    expect(pattern.effectiveLine).toBeCloseTo(0.4, 5)
    expect(pattern.spacing - pattern.effectiveOpening).toBeCloseTo(0.4, 5)
  })

  it('mantém passo uniforme e parede de 0,4 mm entre favos vizinhos', () => {
    const { cells, spacing, effectiveLine } = computeScreenPattern(defaultThermoformerParams)
    expect(effectiveLine).toBeCloseTo(0.4, 5)

    let neighbours = 0
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const distance = Math.hypot(
          cells[i].x - cells[j].x,
          cells[i].y - cells[j].y,
        )
        if (distance < spacing * 1.5) {
          expect(distance).toBeCloseTo(spacing, 9)
          neighbours++
        }
      }
    }
    expect(neighbours).toBeGreaterThan(cells.length)
  })

  it('não gera favos quando o aro consome o disco', () => {
    const pattern = computeScreenPattern({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 30,
    })
    expect(pattern.innerRadius).toBe(0)
    expect(pattern.cells).toHaveLength(0)
  })

  it('limita a quantidade de favos ampliando a abertura', () => {
    const pattern = computeScreenPattern({
      ...defaultThermoformerParams,
      diameter: 300,
      frameWidth: 2,
      opening: 3,
      lineWidth: 1.2,
    })
    expect(pattern.capped).toBe(true)
    expect(pattern.cells.length).toBeLessThanOrEqual(MAX_SCREEN_OPENINGS)
    expect(pattern.effectiveOpening).toBeGreaterThan(3)
    expect(pattern.spacing - pattern.effectiveOpening).toBeCloseTo(1.2, 5)
    for (const cell of pattern.cells) {
      expect(Math.hypot(cell.x, cell.y) + cell.radius).toBeLessThanOrEqual(
        pattern.innerRadius! + 1e-6,
      )
    }
  })

  it('gera favos dentro de um quadrado', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
    }
    const outline = getShapeOutline(params)!
    const pattern = computeScreenPattern(params, outline)
    expect(pattern.cells.length).toBeGreaterThan(50)
    expect(pattern.innerBounds.width).toBeCloseTo(108, 0)
    expect(pattern.cells.every((cell) =>
      Math.abs(cell.x) + cell.radius <= 54 &&
      Math.abs(cell.y) + cell.radius <= 54,
    )).toBe(true)
  })
})
