import { describe, it, expect } from 'vitest'
import {
  roundedRectExactPoints,
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

  it('amostra exata mantém contagem, ordem CCW e arco do canto', () => {
    const points = roundedRectExactPoints(100, 60, 10, 8, 4)
    expect(points).toHaveLength(4 * (8 + 4))

    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    expect(Math.min(...xs)).toBeCloseTo(-50, 6)
    expect(Math.max(...xs)).toBeCloseTo(50, 6)
    expect(Math.min(...ys)).toBeCloseTo(-30, 6)
    expect(Math.max(...ys)).toBeCloseTo(30, 6)

    let area = 0
    for (let i = 0; i < points.length; i++) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      area += a.x * b.y - b.x * a.y
    }
    expect(area).toBeGreaterThan(0)

    const firstCorner = points[4]
    expect(Math.hypot(firstCorner.x - 40, firstCorner.y + 20)).toBeCloseTo(10, 6)
  })
})
