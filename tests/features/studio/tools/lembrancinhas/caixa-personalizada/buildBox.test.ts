import { describe, it, expect, vi } from 'vitest'
import {
  buildBox,
  disposeBoxResult,
} from '@/features/studio/tools/lembrancinhas/caixa-personalizada/buildBox'
import { defaultBoxParams } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/schema'

describe('buildBox', () => {
  it('gera as cinco peças por padrão', () => {
    const result = buildBox(defaultBoxParams)
    expect(result.body).toBeDefined()
    expect(result.lid).not.toBeNull()
    expect(result.frontPanel).toBeDefined()
    expect(result.handle).not.toBeNull()
    expect(result.base).not.toBeNull()
  })

  it('omite peças desabilitadas', () => {
    const result = buildBox({
      ...defaultBoxParams,
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
    const params = defaultBoxParams
    const result = buildBox(params)
    const bodyTop = params.height + params.rimHeight

    result.lid!.computeBoundingBox()
    expect(result.lid!.boundingBox!.min.y).toBeCloseTo(bodyTop - params.lidFitDepth, 1)

    result.frontPanel.computeBoundingBox()
    expect(result.frontPanel.boundingBox!.min.z).toBeCloseTo(params.depth / 2, 1)
    expect(result.frontPanel.boundingBox!.max.y).toBeCloseTo(bodyTop / 2 + params.frontPanelHeight / 2, 1)

    result.handle!.computeBoundingBox()
    expect(result.handle!.boundingBox!.max.x).toBeCloseTo(params.width / 2 + params.handleLength, 1)
  })

  it('posiciona a tampa com encaixe interno a partir do fundo útil', () => {
    const params = {
      ...defaultBoxParams,
      fitType: 'internal' as const,
      height: 20,
      rimHeight: 0,
      bottomThickness: 6,
      lidFitDepth: 20,
    }
    const result = buildBox(params)
    const bodyTop = params.height + params.rimHeight
    const effectiveFitDepth = Math.min(params.lidFitDepth, bodyTop - params.bottomThickness)

    result.lid!.computeBoundingBox()
    expect(result.lid!.boundingBox!.min.y).toBeCloseTo(bodyTop - effectiveFitDepth, 1)
    expect(result.lid!.boundingBox!.min.y).toBeCloseTo(6, 1)
  })

  it('despacha dispose para todas as peças e ignora resultado nulo', () => {
    const result = buildBox(defaultBoxParams)
    const bodySpy = vi.spyOn(result.body, 'dispose')
    const lidSpy = vi.spyOn(result.lid!, 'dispose')
    const frontPanelSpy = vi.spyOn(result.frontPanel, 'dispose')
    const handleSpy = vi.spyOn(result.handle!, 'dispose')
    const baseSpy = vi.spyOn(result.base!, 'dispose')

    disposeBoxResult(result)

    expect(bodySpy).toHaveBeenCalledTimes(1)
    expect(lidSpy).toHaveBeenCalledTimes(1)
    expect(frontPanelSpy).toHaveBeenCalledTimes(1)
    expect(handleSpy).toHaveBeenCalledTimes(1)
    expect(baseSpy).toHaveBeenCalledTimes(1)

    expect(() => disposeBoxResult(null)).not.toThrow()
  })
})
