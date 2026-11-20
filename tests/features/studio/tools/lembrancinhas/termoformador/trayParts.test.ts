import { describe, it, expect } from 'vitest'
import { buildTraySupport } from '@/features/studio/tools/lembrancinhas/termoformador/trayParts'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { getTrayDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/tray'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume, countZeroAreaTriangles } from './geometryTestUtils'

describe('buildTraySupport', () => {
  it('suporte quadrado ocupa o envelope e fica apoiado', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const support = buildTraySupport(params, outline)
    support.computeBoundingBox()
    const box = support.boundingBox!
    expect(box.min.y).toBeCloseTo(0, 2)
    expect(box.max.y).toBeCloseTo(dims.height, 2)
    expect(box.min.x).toBeCloseTo(dims.outerBounds.minX, 1)
    expect(box.max.x).toBeCloseTo(dims.outerBounds.maxX, 1)
    expect(box.min.z).toBeCloseTo(-dims.outerBounds.maxY, 1)
    expect(box.max.z).toBeCloseTo(-dims.outerBounds.minY, 1)
    expect(isClosed(support)).toBe(true)
    expect(signedVolume(support)).toBeGreaterThan(0)
    expect(countZeroAreaTriangles(support)).toBe(0)
    support.dispose()
  })

  it('degrau fica sob a moldura e a abertura é a borda interna', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expect(dims.effectiveStep).toBeCloseTo(params.frameWidth + params.fitClearance, 5)
    expect(dims.stepClamped).toBe(true)
  })

  it('suporte da pirâmide fecha e ocupa a altura', () => {
    const params = { ...defaultThermoformerParams, shape: 'pyramid' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const support = buildTraySupport(params, outline)
    support.computeBoundingBox()
    expect(support.boundingBox!.min.y).toBeCloseTo(0, 2)
    expect(support.boundingBox!.max.y).toBeCloseTo(dims.height, 2)
    expect(isClosed(support)).toBe(true)
    expect(signedVolume(support)).toBeGreaterThan(0)
    support.dispose()
  })
})
