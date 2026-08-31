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
