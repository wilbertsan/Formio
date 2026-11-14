import { describe, it, expect } from 'vitest'
import { computeScreenPattern } from '@/features/studio/tools/lembrancinhas/termoformador/screenPattern'
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
    expect(pattern.spacing).toBeCloseTo(8, 5)

    for (const cell of pattern.cells) {
      expect(Math.hypot(cell.x, cell.y) + cell.radius).toBeLessThanOrEqual(
        pattern.innerRadius + 1e-6,
      )
    }
  })

  it('mantém a linha de 2 mm entre favos vizinhos', () => {
    const pattern = computeScreenPattern(defaultThermoformerParams)
    expect(pattern.effectiveLine).toBeCloseTo(2, 5)
    expect(pattern.spacing - pattern.effectiveOpening).toBeCloseTo(2, 5)
  })

  it('mantém passo uniforme e parede de 2 mm entre favos vizinhos', () => {
    const { cells, spacing, effectiveLine } = computeScreenPattern(defaultThermoformerParams)
    expect(effectiveLine).toBeCloseTo(2, 5)

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
        pattern.innerRadius + 1e-6,
      )
    }
  })
})
