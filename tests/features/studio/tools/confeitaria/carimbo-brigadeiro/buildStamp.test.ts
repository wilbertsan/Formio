import { describe, it, expect } from 'vitest'
import { buildStamp } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp'
import { defaultStampParams } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/schema'

describe('buildStamp', () => {
  it('builds base geometry', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.base).toBeDefined()
    expect(result.base.attributes.position).toBeDefined()
  })

  it('builds handle geometry', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.handle).toBeDefined()
    expect(result.handle.attributes.position).toBeDefined()
  })

  it('returns null for text when font is null', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.text).toBeNull()
  })

  it('returns null for icon when svgIcon is null', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.icon).toBeNull()
  })

  it('base height is 40% of total height', () => {
    const params = { ...defaultStampParams, height: 20 }
    const result = buildStamp({ params, font: null })

    result.base.computeBoundingBox()
    const bb = result.base.boundingBox!
    const baseHeight = bb.max.z - bb.min.z

    expect(baseHeight).toBeCloseTo(8, 0) // 20 * 0.4 = 8mm + bevel
  })

  it('handle height is 60% of total height', () => {
    const params = { ...defaultStampParams, height: 20 }
    const result = buildStamp({ params, font: null })

    result.handle.computeBoundingBox()
    const bb = result.handle.boundingBox!
    const handleHeight = bb.max.z - bb.min.z

    expect(handleHeight).toBeCloseTo(12, 0) // 20 * 0.6 = 12mm + bevel
  })
})
