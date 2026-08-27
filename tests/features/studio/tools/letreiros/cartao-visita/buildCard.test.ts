import * as THREE from 'three'
import { type BufferGeometry } from 'three'
import { buildCard } from '@/features/studio/tools/letreiros/cartao-visita/buildCard'
import { defaultCardParams, type CardParams } from '@/features/studio/tools/letreiros/cartao-visita/schema'

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor(_text?: string, parameters?: { size: number; depth: number }) {
      super()
      if (!parameters) return
      const w = parameters.size * 4
      const h = parameters.size
      const d = parameters.depth
      this.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0,
           -w / 2, -h / 2, d, w / 2, -h / 2, d, w / 2, h / 2, d, -w / 2, h / 2, d],
          3,
        ),
      )
      this.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 7, 4, 0, 3, 7, 1, 5, 6, 1, 6, 2])
    }
  },
}))

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: (geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    if (geos.length === 1) return geos[0].clone()
    const merged = new THREE.BufferGeometry()
    const posArrays: Float32Array[] = []
    const idxArrays: number[][] = []
    let vertexOffset = 0
    for (const geo of geos) {
      geo.computeBoundingBox()
      const pos = geo.getAttribute('position') as THREE.BufferAttribute
      const arr = new Float32Array(pos.array)
      posArrays.push(arr)
      const idx = geo.getIndex()
      if (idx) {
        const shifted = Array.from(idx.array).map((v: number) => v + vertexOffset)
        idxArrays.push(shifted)
      }
      vertexOffset += pos.count
    }
    const allPos = new Float32Array(posArrays.reduce((s, a) => s + a.length, 0))
    let offset = 0
    for (const a of posArrays) { allPos.set(a, offset); offset += a.length }
    merged.setAttribute('position', new THREE.BufferAttribute(allPos, 3))
    if (idxArrays.length > 0) {
      const allIdx = idxArrays.flat()
      merged.setIndex(allIdx)
    }
    return merged
  },
}))

const fontStub = {
  glyphs: {},
  generateShapes: () => [],
} as never

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

      const pos0 = r0.base.getAttribute('position')
      const pos5 = r5.base.getAttribute('position')

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

    it('creates text blocks when font is provided', () => {
      const result = buildCard({ params: makeParams(), font: fontStub })
      expect(result.textBlocks.length).toBe(3)
      expect(result.text).toBeDefined()
    })

    it('positions text blocks correctly for centered layout', () => {
      const result = buildCard({ params: makeParams({ layout: 'centered' }), font: fontStub })
      
      const block1 = result.textBlocks.find((b: { id: string; geometry: BufferGeometry }) => b.id === 'block-1')
      const block2 = result.textBlocks.find((b: { id: string; geometry: BufferGeometry }) => b.id === 'block-2')
      const block3 = result.textBlocks.find((b: { id: string; geometry: BufferGeometry }) => b.id === 'block-3')
      
      expect(block1).toBeDefined()
      expect(block2).toBeDefined()
      expect(block3).toBeDefined()
      
      block1!.geometry.computeBoundingBox()
      block2!.geometry.computeBoundingBox()
      block3!.geometry.computeBoundingBox()
      
      const bb1 = block1!.geometry.boundingBox!
      const bb2 = block2!.geometry.boundingBox!
      const bb3 = block3!.geometry.boundingBox!
      
      // All blocks should be centered horizontally
      const cx1 = (bb1.min.x + bb1.max.x) / 2
      const cx2 = (bb2.min.x + bb2.max.x) / 2
      const cx3 = (bb3.min.x + bb3.max.x) / 2
      expect(cx1).toBeCloseTo(0, 0)
      expect(cx2).toBeCloseTo(0, 0)
      expect(cx3).toBeCloseTo(0, 0)
      
      // Blocks should be stacked vertically (top to bottom)
      expect(bb1.min.y).toBeGreaterThan(bb2.max.y)
      expect(bb2.min.y).toBeGreaterThan(bb3.max.y)
    })

    it('positions text blocks correctly for left layout', () => {
      const result = buildCard({ params: makeParams({ layout: 'left' }), font: fontStub })
      
      const block1 = result.textBlocks.find((b: { id: string; geometry: BufferGeometry }) => b.id === 'block-1')
      const block2 = result.textBlocks.find((b: { id: string; geometry: BufferGeometry }) => b.id === 'block-2')
      const block3 = result.textBlocks.find((b: { id: string; geometry: BufferGeometry }) => b.id === 'block-3')
      
      expect(block1).toBeDefined()
      expect(block2).toBeDefined()
      expect(block3).toBeDefined()
      
      block1!.geometry.computeBoundingBox()
      block2!.geometry.computeBoundingBox()
      block3!.geometry.computeBoundingBox()
      
      const bb1 = block1!.geometry.boundingBox!
      const bb2 = block2!.geometry.boundingBox!
      const bb3 = block3!.geometry.boundingBox!
      
      // All blocks should have left edge at -halfWidth + MARGIN_MIN
      const expectedLeft = -85 / 2 + 3
      expect(bb1.min.x).toBeCloseTo(expectedLeft, 0)
      expect(bb2.min.x).toBeCloseTo(expectedLeft, 0)
      expect(bb3.min.x).toBeCloseTo(expectedLeft, 0)
      
      // Blocks should be stacked vertically
      expect(bb1.min.y).toBeGreaterThan(bb2.max.y)
      expect(bb2.min.y).toBeGreaterThan(bb3.max.y)
    })

    it('applies offsets to text blocks', () => {
      const params = makeParams({
        blocks: [
          { id: 'block-1', content: 'Nome', fontStyle: 'bold', fontSize: 8, relief: 1, offsetX: 5, offsetY: 3 },
          { id: 'block-2', content: 'Cargo', fontStyle: 'normal', fontSize: 5, relief: 0.8, offsetX: 0, offsetY: 0 },
          { id: 'block-3', content: 'contato@email.com', fontStyle: 'normal', fontSize: 4, relief: 0.6, offsetX: 0, offsetY: 0 },
        ]
      })
      const result = buildCard({ params, font: fontStub })
      
      const block1 = result.textBlocks.find((b: { id: string; geometry: BufferGeometry }) => b.id === 'block-1')
      expect(block1).toBeDefined()
      
      block1!.geometry.computeBoundingBox()
      const bb1 = block1!.geometry.boundingBox!
      
      // Block 1 center X should be offset by 5mm from center
      const cx1 = (bb1.min.x + bb1.max.x) / 2
      expect(cx1).toBeCloseTo(5, 0)
    })

    it('clamps text blocks within margins', () => {
      const params = makeParams({
        blocks: [
          { id: 'block-1', content: 'Nome', fontStyle: 'bold', fontSize: 8, relief: 1, offsetX: 25, offsetY: 0 },
          { id: 'block-2', content: 'Cargo', fontStyle: 'normal', fontSize: 5, relief: 0.8, offsetX: 0, offsetY: 0 },
          { id: 'block-3', content: 'contato@email.com', fontStyle: 'normal', fontSize: 4, relief: 0.6, offsetX: 0, offsetY: 0 },
        ]
      })
      const result = buildCard({ params, font: fontStub })
      
      const block1 = result.textBlocks.find((b: { id: string; geometry: BufferGeometry }) => b.id === 'block-1')
      expect(block1).toBeDefined()
      
      block1!.geometry.computeBoundingBox()
      const bb1 = block1!.geometry.boundingBox!
      
      // Block should be clamped to stay within 3mm margin
      const halfWidth = 85 / 2
      const margin = 3
      expect(bb1.min.x).toBeGreaterThanOrEqual(-halfWidth + margin)
      expect(bb1.max.x).toBeLessThanOrEqual(halfWidth - margin)
    })
  })
})
