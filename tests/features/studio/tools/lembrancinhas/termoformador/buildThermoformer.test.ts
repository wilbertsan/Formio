import { describe, it, expect } from 'vitest'
import { buildThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/buildThermoformer'
import { getSupportDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/buildSupport'
import { getPlugDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/buildPlug'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed } from './geometryTestUtils'

describe('buildThermoformer', () => {
  it('coloca a tela nivelada no assento do suporte', () => {
    const result = buildThermoformer(defaultThermoformerParams)
    const dims = getSupportDimensions(defaultThermoformerParams)

    // O assento é medido a partir da base, independente da espessura da tela.
    expect(result.seatY).toBeCloseTo(
      defaultThermoformerParams.bottomThickness + defaultThermoformerParams.bowlDepth,
      5,
    )
    // A tela, transladada para seatY, fica nivelada com o topo do suporte.
    expect(result.seatY + defaultThermoformerParams.thickness)
      .toBeCloseTo(dims.height, 5)
    expect(result.screen).toBeDefined()
    expect(result.support).toBeDefined()
    expect(result.plug).toBeDefined()

    result.screen.computeBoundingBox()
    expect(result.screen.boundingBox!.max.y - result.screen.boundingBox!.min.y)
      .toBeCloseTo(defaultThermoformerParams.thickness, 3)

    result.support.computeBoundingBox()
    expect(result.support.boundingBox!.max.y)
      .toBeCloseTo(dims.height, 3)

    result.plug.computeBoundingBox()
    expect(result.plug.boundingBox!.max.y)
      .toBeCloseTo(getPlugDimensions(defaultThermoformerParams).bodyTop, 3)

    expect(isClosed(result.screen)).toBe(true)
    expect(isClosed(result.support)).toBe(true)
    expect(isClosed(result.plug)).toBe(true)

    result.screen.dispose()
    result.support.dispose()
    result.plug.dispose()
  })

  it('lança para SVG sem parsedSvg (estado intermediário do Task 11)', () => {
    expect(() => buildThermoformer({
      ...defaultThermoformerParams,
      shape: 'svg',
      svg: '<svg/>',
    })).toThrow()
  })
})
