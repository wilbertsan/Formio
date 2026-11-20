import { describe, it, expect } from 'vitest'
import { extrudeOutline, loftOutline } from '@/features/studio/tools/lembrancinhas/termoformador/loft'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import {
  scalePaths,
  type ClipperPoint,
} from '@/features/studio/tools/confeitaria/shared/textOutline'
import { isClosed, signedVolume } from './geometryTestUtils'

function squarePath(minX: number, minY: number, size: number): ClipperPoint[] {
  return [
    { X: minX, Y: minY },
    { X: minX + size, Y: minY },
    { X: minX + size, Y: minY + size },
    { X: minX, Y: minY + size },
  ]
}

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

  it('extruda todos os contornos desconexos', () => {
    const paths = [
      squarePath(-100_000, -50_000, 50_000),
      squarePath(50_000, -50_000, 50_000),
    ]
    const geometry = extrudeOutline(paths, 20, 0)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.min.x).toBeCloseTo(-100, 1)
    expect(box.max.x).toBeCloseTo(100, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('não lofta contornos desconexos', () => {
    const top = [
      squarePath(-100_000, -50_000, 50_000),
      squarePath(50_000, -50_000, 50_000),
    ]
    const bottom = scalePaths(top, 0.5)
    const geometry = loftOutline(top, bottom, 0, 10)
    expect(geometry.getAttribute('position')?.count ?? 0).toBe(0)
    geometry.dispose()
  })
})
