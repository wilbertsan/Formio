import { buildCard, type BuildCardInput } from '@/features/studio/tools/letreiros/cartao-visita/buildCard'
import { defaultCardParams, type CardParams } from '@/features/studio/tools/letreiros/cartao-visita/schema'

function makeParams(overrides: Partial<CardParams> = {}): CardParams {
  return { ...defaultCardParams, ...overrides }
}

describe('buildCard', () => {
  describe('base geometry', () => {
    it('returns a BufferGeometry for the base', () => {
      const result = buildCard({ params: makeParams() })
      expect(result.base).toBeDefined()
      expect(result.base.getAttribute('position')).toBeDefined()
    })

    it('has correct width and height for default params (85mm x 55mm)', () => {
      const result = buildCard({ params: makeParams() })
      result.base.computeBoundingBox()
      const bb = result.base.boundingBox!
      const width = bb.max.x - bb.min.x
      const height = bb.max.y - bb.min.y
      expect(width).toBeCloseTo(85, 0)
      expect(height).toBeCloseTo(55, 0)
    })

    it('has correct thickness for default params (2mm)', () => {
      const result = buildCard({ params: makeParams() })
      result.base.computeBoundingBox()
      const bb = result.base.boundingBox!
      const depth = bb.max.z - bb.min.z
      expect(depth).toBeCloseTo(2, 0)
    })

    it('is centered at origin in x and y', () => {
      const result = buildCard({ params: makeParams() })
      result.base.computeBoundingBox()
      const bb = result.base.boundingBox!
      const cx = (bb.min.x + bb.max.x) / 2
      const cy = (bb.min.y + bb.max.y) / 2
      expect(cx).toBeCloseTo(0, 5)
      expect(cy).toBeCloseTo(0, 5)
    })

    it('respects custom width and height', () => {
      const result = buildCard({ params: makeParams({ width: 70, height: 40 }) })
      result.base.computeBoundingBox()
      const bb = result.base.boundingBox!
      const width = bb.max.x - bb.min.x
      const height = bb.max.y - bb.min.y
      expect(width).toBeCloseTo(70, 0)
      expect(height).toBeCloseTo(40, 0)
    })

    it('respects custom thickness', () => {
      const result = buildCard({ params: makeParams({ thickness: 3 }) })
      result.base.computeBoundingBox()
      const bb = result.base.boundingBox!
      const depth = bb.max.z - bb.min.z
      expect(depth).toBeCloseTo(3, 0)
    })
  })

  describe('corner radius', () => {
    it('produces a different geometry when cornerRadius changes', () => {
      const r0 = buildCard({ params: makeParams({ cornerRadius: 0 }) })
      const r5 = buildCard({ params: makeParams({ cornerRadius: 5 }) })

      r0.base.computeBoundingBox()
      r5.base.computeBoundingBox()

      const bb0 = r0.base.boundingBox!
      const bb5 = r5.base.boundingBox!

      const pos0 = r0.base.getAttribute('position')
      const pos5 = r5.base.getAttribute('position')

      const dims0 = `${(bb0.max.x - bb0.min.x).toFixed(2)}x${(bb0.max.y - bb0.min.y).toFixed(2)}`
      const dims5 = `${(bb5.max.x - bb5.min.x).toFixed(2)}x${(bb5.max.y - bb5.min.y).toFixed(2)}`

      const arr0 = new Float32Array(pos0.array)
      const arr5 = new Float32Array(pos5.array)
      const samePositionData =
        arr0.length === arr5.length &&
        arr0.every((v, i) => Math.abs(v - arr5[i]) < 1e-6)

      expect(samePositionData).toBe(false)
    })

    it('with cornerRadius=0 still has correct outer dimensions', () => {
      const result = buildCard({ params: makeParams({ cornerRadius: 0 }) })
      result.base.computeBoundingBox()
      const bb = result.base.boundingBox!
      expect(bb.max.x - bb.min.x).toBeCloseTo(85, 0)
      expect(bb.max.y - bb.min.y).toBeCloseTo(55, 0)
    })

    it('with cornerRadius=5 still has correct outer dimensions', () => {
      const result = buildCard({ params: makeParams({ cornerRadius: 5 }) })
      result.base.computeBoundingBox()
      const bb = result.base.boundingBox!
      expect(bb.max.x - bb.min.x).toBeCloseTo(85, 0)
      expect(bb.max.y - bb.min.y).toBeCloseTo(55, 0)
    })
  })

  describe('text blocks', () => {
    it('returns empty textBlocks when no font provided', () => {
      const result = buildCard({ params: makeParams() })
      expect(result.textBlocks).toEqual([])
      expect(result.text).toBeNull()
    })
  })
})
