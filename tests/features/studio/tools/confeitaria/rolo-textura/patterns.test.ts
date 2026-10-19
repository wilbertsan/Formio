import { describe, it, expect } from 'vitest'
import { motifShapes, isStaggered } from '@/features/studio/tools/confeitaria/rolo-textura/patterns'
import { MOTIFS_BY_FAMILY } from '@/features/studio/tools/confeitaria/rolo-textura/schema'

const allPoints = (shapes: ReturnType<typeof motifShapes>) =>
  shapes.flatMap((s) => [...s.outer, ...s.holes.flat()])

describe('patterns', () => {
  for (const [family, motifs] of Object.entries(MOTIFS_BY_FAMILY)) {
    for (const motif of motifs) {
      it(`${family}/${motif} tem geometria dentro da célula`, () => {
        const shapes = motifShapes(family as never, motif as never)
        expect(shapes.length).toBeGreaterThan(0)
        for (const p of allPoints(shapes)) {
          expect(p.x).toBeGreaterThanOrEqual(-0.5)
          expect(p.x).toBeLessThanOrEqual(0.5)
          expect(p.y).toBeGreaterThanOrEqual(-0.5)
          expect(p.y).toBeLessThanOrEqual(0.5)
        }
      })
    }
  }
  it('grid tem furo interno', () => {
    expect(motifShapes('geometric', 'grid')[0].holes.length).toBe(1)
  })
  it('ondas e chevrons tocam a borda em X (continuidade)', () => {
    for (const m of ['waves', 'chevrons'] as const) {
      const xs = allPoints(motifShapes('wave', m)).map((p) => p.x)
      expect(Math.min(...xs)).toBeCloseTo(-0.5, 5)
      expect(Math.max(...xs)).toBeCloseTo(0.5, 5)
    }
  })
  it('marca stagger', () => {
    expect(isStaggered('diamonds')).toBe(true)
    expect(isStaggered('grid')).toBe(false)
  })
})
