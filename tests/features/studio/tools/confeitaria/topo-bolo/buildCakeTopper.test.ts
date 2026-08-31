import { describe, it, expect } from 'vitest'
import { buildCakeTopper } from '@/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper'
import { defaultCakeTopperParams } from '@/features/studio/tools/confeitaria/topo-bolo/schema'

describe('buildCakeTopper - plate', () => {
  it('builds circle plate', () => {
    const params = { ...defaultCakeTopperParams, shape: 'circle' as const }
    const result = buildCakeTopper({ params, font: null })
    expect(result.plate).toBeDefined()
    expect(result.plate.attributes.position).toBeDefined()
  })

  it('builds rectangle plate', () => {
    const params = { ...defaultCakeTopperParams, shape: 'rectangle' as const }
    const result = buildCakeTopper({ params, font: null })
    expect(result.plate).toBeDefined()
  })

  it('builds oval plate', () => {
    const params = { ...defaultCakeTopperParams, shape: 'oval' as const }
    const result = buildCakeTopper({ params, font: null })
    expect(result.plate).toBeDefined()
  })
})

describe('buildCakeTopper - leg', () => {
  it('builds trapezoidal leg', () => {
    const params = { ...defaultCakeTopperParams }
    const result = buildCakeTopper({ params, font: null })
    expect(result.leg).toBeDefined()
    expect(result.leg!.attributes.position).toBeDefined()
  })

  it('leg is positioned below plate', () => {
    const params = { ...defaultCakeTopperParams, legHeight: 40 }
    const result = buildCakeTopper({ params, font: null })
    result.leg!.computeBoundingBox()
    const bb = result.leg!.boundingBox!
    expect(bb.max.z).toBeCloseTo(0, 1)
    expect(bb.min.z).toBeCloseTo(-40, 1)
  })
})
