import { describe, it, expect } from 'vitest'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { buildThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/buildThermoformer'
import { getSupportDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/buildSupport'
import { getPlugDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/buildPlug'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { getTrayDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/tray'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed } from './geometryTestUtils'

const triangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,5 95,95 5,95" fill="#000"/>
</svg>`

describe('buildThermoformer', () => {
  it('coloca a tela nivelada no assento do suporte', () => {
    const result = buildThermoformer(defaultThermoformerParams)!
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

  it('monta as três peças da forma quadrada', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const result = buildThermoformer(params)
    expect(result).not.toBeNull()
    const built = result!

    expect(built.seatY).toBeCloseTo(dims.seatY, 5)
    built.screen.computeBoundingBox()
    built.support.computeBoundingBox()
    built.plug.computeBoundingBox()
    expect(
      built.support.boundingBox!.max.x - built.support.boundingBox!.min.x,
    ).toBeCloseTo(dims.outerBounds.width, 1)
    expect(
      built.screen.boundingBox!.max.x - built.screen.boundingBox!.min.x,
    ).toBeCloseTo(params.width, 1)
    expect(
      built.plug.boundingBox!.max.x - built.plug.boundingBox!.min.x,
    ).toBeCloseTo(params.width, 1)
    expect(isClosed(built.screen)).toBe(true)
    expect(isClosed(built.support)).toBe(true)
    expect(isClosed(built.plug)).toBe(true)

    built.screen.dispose()
    built.support.dispose()
    built.plug.dispose()
  })

  it('usa a profundidade efetiva da bandeja no assento', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 40,
      bowlDepth: 60,
      draftAngle: 15,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const result = buildThermoformer(params)
    expect(result).not.toBeNull()
    const built = result!

    expect(dims.depthLimited).toBe(true)
    expect(built.seatY).toBeCloseTo(dims.seatY, 5)
    expect(built.seatY).not.toBeCloseTo(
      getSupportDimensions(params).seatY,
      3,
    )
    built.support.computeBoundingBox()
    expect(
      built.support.boundingBox!.max.x - built.support.boundingBox!.min.x,
    ).toBeCloseTo(dims.outerBounds.width, 1)
    expect(isClosed(built.screen)).toBe(true)
    expect(isClosed(built.support)).toBe(true)
    expect(isClosed(built.plug)).toBe(true)

    built.screen.dispose()
    built.support.dispose()
    built.plug.dispose()
  })

  it('retorna null para SVG sem parsedSvg', () => {
    expect(buildThermoformer({
      ...defaultThermoformerParams,
      shape: 'svg',
      svg: '<svg/>',
    })).toBeNull()
  })

  it('monta as três peças de um SVG triangular', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'svg' as const,
      svg: triangle,
    }
    const result = buildThermoformer(params, parseSvg(triangle))
    expect(result).not.toBeNull()
    const built = result!

    expect(isClosed(built.screen)).toBe(true)
    expect(isClosed(built.support)).toBe(true)
    expect(isClosed(built.plug)).toBe(true)

    built.screen.dispose()
    built.support.dispose()
    built.plug.dispose()
  })
})
