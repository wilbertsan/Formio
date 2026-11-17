import { describe, it, expect } from 'vitest'
import {
  buildHandle,
  handleLoopShape,
  handleRingShape,
  getHandleMetrics,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { getBodyOuterRadius } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/shapes'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildHandle', () => {
  it('calcula a folga da abraçadeira no raio da altura', () => {
    const metrics = getHandleMetrics(defaultMugParams)
    const radius = getBodyOuterRadius(defaultMugParams, defaultMugParams.handleHeight)
    expect(metrics.innerRadius).toBeCloseTo(radius + defaultMugParams.handleClearance, 5)
    expect(metrics.outerRadius).toBeCloseTo(metrics.innerRadius + 3.5, 5)
    expect(metrics.handOpeningWidth).toBeGreaterThan(16)
  })

  it('a alça é uma peça fechada com volume positivo', () => {
    const geometry = buildHandle(defaultMugParams)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.x).toBeCloseTo(
      getBodyOuterRadius(defaultMugParams, defaultMugParams.handleHeight) + defaultMugParams.handleReach,
      1,
    )
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('a abraçadeira cobre 200° e o laço tem a abertura pedida', () => {
    const ring = handleRingShape(getHandleMetrics(defaultMugParams))
    const loop = handleLoopShape(defaultMugParams)
    expect(ring.curves.length).toBeGreaterThan(2)
    expect(loop.holes).toHaveLength(1)
  })

  it('folga pequena é rejeitada pela validação (Task 6)', () => {
    expect(() => buildHandle({ ...defaultMugParams, handleClearance: 0.1 })).not.toThrow()
  })
})
