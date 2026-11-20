import { describe, it, expect } from 'vitest'
import { extrudeOutline, loftOutline } from '@/features/studio/tools/lembrancinhas/termoformador/loft'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { scalePaths } from '@/features/studio/tools/confeitaria/shared/textOutline'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('loft', () => {
  it('extruda um prisma fechado', () => {
    const outline = getShapeOutline({ ...defaultThermoformerParams, shape: 'square' as const, width: 100 })!
    const geometry = extrudeOutline(outline.paths!, 20, 0)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('lofta topo e fundo reduzido fechados', () => {
    const outline = getShapeOutline({ ...defaultThermoformerParams, shape: 'square' as const, width: 100 })!
    const bottom = scalePaths(outline.cavityOpening!, 0.5)
    const geometry = loftOutline(outline.cavityOpening!, bottom, 4, 24)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })
})
