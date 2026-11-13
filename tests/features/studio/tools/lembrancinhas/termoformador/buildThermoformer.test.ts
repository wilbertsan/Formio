import { describe, it, expect } from 'vitest'
import { buildThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/buildThermoformer'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('buildThermoformer', () => {
  it('gera as cinco peças por padrão', () => {
    const result = buildThermoformer(defaultThermoformerParams)
    expect(result.body).toBeDefined()
    expect(result.lid).not.toBeNull()
    expect(result.frontPanel).toBeDefined()
    expect(result.handle).not.toBeNull()
    expect(result.base).not.toBeNull()
  })

  it('omite peças desabilitadas', () => {
    const result = buildThermoformer({
      ...defaultThermoformerParams,
      lidEnabled: false,
      handleEnabled: false,
      baseEnabled: false,
    })
    expect(result.lid).toBeNull()
    expect(result.handle).toBeNull()
    expect(result.base).toBeNull()
    expect(result.body).toBeDefined()
    expect(result.frontPanel).toBeDefined()
  })

  it('posiciona tampa, painel e pino na montagem', () => {
    const params = defaultThermoformerParams
    const result = buildThermoformer(params)
    const bodyTop = params.height + params.rimHeight

    result.lid!.computeBoundingBox()
    expect(result.lid!.boundingBox!.min.y).toBeCloseTo(bodyTop - params.lidFitDepth, 1)

    result.frontPanel.computeBoundingBox()
    expect(result.frontPanel.boundingBox!.min.z).toBeCloseTo(params.depth / 2, 1)
    expect(result.frontPanel.boundingBox!.max.y).toBeCloseTo(bodyTop / 2 + params.frontPanelHeight / 2, 1)

    result.handle!.computeBoundingBox()
    expect(result.handle!.boundingBox!.max.x).toBeCloseTo(params.width / 2 + params.handleLength, 1)
  })
})
