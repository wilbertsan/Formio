import { describe, it, expect } from 'vitest'
import {
  roundedRectPath,
  roundedRectPoints,
  roundedRectShape,
} from '@/features/studio/tools/lembrancinhas/termoformador/shapes'

describe('shapes', () => {
  it('gera exatamente a contagem de pontos pedida', () => {
    const points = roundedRectPoints(100, 60, 10, 64)
    expect(points).toHaveLength(64)
    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    expect(Math.min(...xs)).toBeCloseTo(-50, 1)
    expect(Math.max(...xs)).toBeCloseTo(50, 1)
    expect(Math.min(...ys)).toBeCloseTo(-30, 1)
    expect(Math.max(...ys)).toBeCloseTo(30, 1)
  })

  it('suporta raio zero', () => {
    const points = roundedRectPoints(100, 60, 0, 16)
    expect(points).toHaveLength(16)
    expect(points.every((point) => Math.abs(point.x) <= 50.001 && Math.abs(point.y) <= 30.001)).toBe(true)
  })

  it('cria shape e path sem furos', () => {
    const shape = roundedRectShape(100, 60, 10)
    const path = roundedRectPath(100, 60, 10)
    expect(shape.getPoints(8).length).toBeGreaterThan(8)
    expect(shape.holes).toHaveLength(0)
    expect(path.getPoints(8).length).toBeGreaterThan(8)
  })
})
