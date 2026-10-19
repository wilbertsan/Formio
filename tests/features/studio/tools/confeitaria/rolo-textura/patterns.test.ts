import { describe, it, expect } from 'vitest'
import { motifShapes, isStaggered } from '@/features/studio/tools/confeitaria/rolo-textura/patterns'
import type { Point2 } from '@/features/studio/tools/confeitaria/rolo-textura/patterns'
import { MOTIFS_BY_FAMILY } from '@/features/studio/tools/confeitaria/rolo-textura/schema'
import type { PatternFamily, PatternMotif } from '@/features/studio/tools/confeitaria/rolo-textura/schema'

const allPoints = (shapes: ReturnType<typeof motifShapes>) =>
  shapes.flatMap((s) => [...s.outer, ...s.holes.flat()])

const signedArea = (points: Point2[]): number => {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    area += a.x * b.y - b.x * a.y
  }
  return area / 2
}

const hasDuplicateVertices = (points: Point2[]): boolean =>
  points.some((p, i) => {
    const q = points[(i + 1) % points.length]
    return p.x === q.x && p.y === q.y
  })

const ysAtX = (points: Point2[], x: number): number[] =>
  points.filter((p) => p.x === x).map((p) => p.y).sort((a, b) => a - b)

describe('patterns', () => {
  for (const [family, motifs] of Object.entries(MOTIFS_BY_FAMILY)) {
    for (const motif of motifs) {
      it(`${family}/${motif} tem geometria dentro da célula`, () => {
        const shapes = motifShapes(family as PatternFamily, motif as PatternMotif)
        expect(shapes.length).toBeGreaterThan(0)
        for (const p of allPoints(shapes)) {
          expect(p.x).toBeGreaterThanOrEqual(-0.5)
          expect(p.x).toBeLessThanOrEqual(0.5)
          expect(p.y).toBeGreaterThanOrEqual(-0.5)
          expect(p.y).toBeLessThanOrEqual(0.5)
        }
      })

      it(`${family}/${motif} tem outers CCW e furos CW`, () => {
        for (const shape of motifShapes(family as PatternFamily, motif as PatternMotif)) {
          expect(signedArea(shape.outer)).toBeGreaterThan(0)
          for (const hole of shape.holes) {
            expect(signedArea(hole)).toBeLessThan(0)
          }
        }
      })

      it(`${family}/${motif} não tem vértices consecutivos duplicados`, () => {
        for (const shape of motifShapes(family as PatternFamily, motif as PatternMotif)) {
          for (const polygon of [shape.outer, ...shape.holes]) {
            expect(hasDuplicateVertices(polygon)).toBe(false)
          }
        }
      })
    }
  }

  it('grid tem furo interno', () => {
    expect(motifShapes('geometric', 'grid')[0].holes.length).toBe(1)
  })

  it('rosette tem furo central', () => {
    expect(motifShapes('floral', 'rosette')[0].holes).toHaveLength(1)
  })

  it('motivo de outra família retorna vazio', () => {
    expect(motifShapes('floral', 'grid')).toEqual([])
  })

  it('ondas e chevrons tocam a borda em X (continuidade)', () => {
    for (const m of ['waves', 'chevrons'] as const) {
      const points = allPoints(motifShapes('wave', m))
      const xs = points.map((p) => p.x)
      expect(Math.min(...xs)).toBeCloseTo(-0.5, 5)
      expect(Math.max(...xs)).toBeCloseTo(0.5, 5)

      const left = ysAtX(points, -0.5)
      const right = ysAtX(points, 0.5)
      expect(left).toHaveLength(right.length)
      left.forEach((y, i) => expect(y).toBeCloseTo(right[i], 5))
    }
  })

  it('marca stagger de todos os motivos', () => {
    const expected = {
      diamonds: true, dots: true, grid: false, waves: false, chevrons: false,
      scales: true, flower: true, leaf: true, rosette: false,
    } satisfies Record<PatternMotif, boolean>

    for (const [motif, staggered] of Object.entries(expected)) {
      expect(isStaggered(motif as PatternMotif)).toBe(staggered)
    }
  })
})
