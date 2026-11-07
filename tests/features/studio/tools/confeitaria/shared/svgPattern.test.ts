import { describe, it, expect } from 'vitest'
import { svgPatternShapes } from '@/features/studio/tools/confeitaria/shared/svgPattern'
import type { ParsedSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

function shapeBounds(shapes: ReturnType<typeof svgPatternShapes>) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const shape of shapes) {
    for (const p of [...shape.outer, ...shape.holes.flat()]) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
  }
  return { width: maxX - minX, height: maxY - minY }
}

const circleFill = (radius: number): ParsedSvg => ({
  fills: [{
    outer: Array.from({ length: 64 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2
      return { x: Math.cos(a) * radius, y: Math.sin(a) * radius }
    }),
    holes: [],
  }],
  strokes: [],
})

describe('svgPatternShapes', () => {
  it('mantém o círculo circular (escala uniforme)', () => {
    const shapes = svgPatternShapes(circleFill(1), { targetSpan: 4, minFeatureMm: 0.8 })
    const bounds = shapeBounds(shapes)
    expect(bounds.width).toBeCloseTo(bounds.height, 5)
    expect(Math.max(bounds.width, bounds.height)).toBeCloseTo(4, 2)
  })

  it('engrossa traço fino até 0,8 mm', () => {
    const parsed: ParsedSvg = {
      fills: [],
      strokes: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], width: 0.01 }],
    }
    const shapes = svgPatternShapes(parsed, { targetSpan: 4, minFeatureMm: 0.8 })
    const bounds = shapeBounds(shapes)
    expect(bounds.height).toBeGreaterThanOrEqual(0.79)
    expect(bounds.height).toBeLessThanOrEqual(0.81)
  })

  it('não dilata preenchimento sólido', () => {
    const parsed: ParsedSvg = {
      fills: [{
        outer: [
          { x: -0.5, y: -0.5 },
          { x: 0.5, y: -0.5 },
          { x: 0.5, y: 0.5 },
          { x: -0.5, y: 0.5 },
        ],
        holes: [],
      }],
      strokes: [],
    }
    const shapes = svgPatternShapes(parsed, { targetSpan: 4, minFeatureMm: 0.8 })
    const bounds = shapeBounds(shapes)
    expect(bounds.width).toBeCloseTo(4, 2)
    expect(bounds.height).toBeCloseTo(4, 2)
  })

  it('engrossa preenchimento fino', () => {
    const parsed: ParsedSvg = {
      fills: [{
        outer: [
          { x: -0.05, y: -0.5 },
          { x: 0.05, y: -0.5 },
          { x: 0.05, y: 0.5 },
          { x: -0.05, y: 0.5 },
        ],
        holes: [],
      }],
      strokes: [],
    }
    const shapes = svgPatternShapes(parsed, { targetSpan: 4, minFeatureMm: 0.8 })
    const bounds = shapeBounds(shapes)
    expect(bounds.width).toBeGreaterThanOrEqual(0.79)
  })
})
