import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BoxGeometry } from 'three'
import { useMug } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/useMug'
import {
  defaultMugParams,
  MAX_TEXT_LENGTH,
  type MugGeometryParams,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import {
  serializeBuildResult,
  type SerializedBuildResult,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/workerGeometry'
import type { MugWorker } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/workerClient'

const FRIENDLY_ERROR = 'Falha ao gerar a geometria'

function serializedMug(): SerializedBuildResult {
  return serializeBuildResult({
    body: new BoxGeometry(80, 88, 80),
    handle: new BoxGeometry(52, 43, 12),
  }).data
}

function serializedMugWithOffsetHandle(): SerializedBuildResult {
  return serializeBuildResult({
    body: new BoxGeometry(80, 88, 80),
    handle: new BoxGeometry(52, 43, 12).translate(50, 0, 0),
  }).data
}

function makeWorkerFixture(
  serialize: () => SerializedBuildResult = serializedMug,
) {
  let lastParams: MugGeometryParams | null = null
  let calls = 0
  const pendings: Array<(data: SerializedBuildResult) => void> = []
  const failures: Array<(message?: string) => void> = []
  const terminate = vi.fn()
  const factory = (): MugWorker => {
    calls++
    return {
      build: (params, onResult, onError) => {
        lastParams = params
        pendings.push(onResult)
        failures.push(onError ?? (() => undefined))
      },
      terminate,
    }
  }
  return {
    factory,
    terminate,
    getCalls: () => calls,
    respond: () => pendings[pendings.length - 1]?.(serialize()),
    respondFirst: () => pendings[0]?.(serialize()),
    fail: (message?: string) => failures[failures.length - 1]?.(message),
    getParams: () => lastParams,
  }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('useMug', () => {
  it('retorna os defaults e a capacidade', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    expect(result.current.params).toEqual(defaultMugParams)
    expect(result.current.geometry).toBeNull()
    expect(result.current.builtParams).toBeNull()
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.issues).toEqual([])
    expect(result.current.capacityMl).toBeCloseTo(338, 0)
  })

  it('faz clamp dos campos numéricos', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('diameterTop', 999)
      result.current.updateParam('diameterTop', 10)
      result.current.updateParam('handleGap', 999)
      result.current.updateParam('handleGap', 1)
      result.current.updateParam('textSize', 999)
      result.current.updateParam('textSize', 1)
    })
    expect(result.current.params.diameterTop).toBe(70)
    expect(result.current.params.handleGap).toBe(24)
    expect(result.current.params.textSize).toBe(6)

    act(() => { result.current.updateParam('diameterTop', 100) })
    expect(result.current.params.diameterTop).toBe(100)
    act(() => { result.current.updateParam('handleGap', 40) })
    expect(result.current.params.handleGap).toBe(40)
    act(() => { result.current.updateParam('textSize', 18) })
    expect(result.current.params.textSize).toBe(18)
  })

  it('trunca o texto antes de validar', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { result.current.updateParam('text', 'x'.repeat(MAX_TEXT_LENGTH + 12)) })
    expect(result.current.params.text).toHaveLength(MAX_TEXT_LENGTH)
    expect(result.current.params.text).toBe('x'.repeat(MAX_TEXT_LENGTH))
  })

  it('mantém handleEnabled booleano', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { result.current.updateParam('handleEnabled', false) })
    expect(result.current.params.handleEnabled).toBe(false)
    act(() => { result.current.updateParam('handleEnabled', true) })
    expect(result.current.params.handleEnabled).toBe(true)
    act(() => { result.current.updateParam('handleEnabled', 0) })
    expect(result.current.params.handleEnabled).toBe(true)
  })

  it('envia ao worker após o debounce sem as cores', () => {
    const { factory, getCalls, getParams, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(200) })
    expect(getCalls()).toBe(0)

    act(() => { vi.advanceTimersByTime(60) })
    expect(getCalls()).toBe(1)
    expect(result.current.isBuilding).toBe(true)
    expect(result.current.error).toBeNull()
    expect(getParams()).toEqual({
      productType: 'caneca-personalizada',
      diameterTop: 80,
      diameterBottom: 72,
      height: 88,
      wallThickness: 2.4,
      bottomThickness: 3.2,
      rimChamfer: 0.6,
      handleEnabled: true,
      handleHeight: 52,
      handleGap: 30,
      handleReach: 40,
      handleBand: 6.5,
      handleWidth: 12,
      handleClearance: 0.3,
      text: 'Festa',
      textSize: 10,
      fontStyle: 'normal',
      textCenterY: 60,
    })
    expect(getParams()).not.toHaveProperty('bodyColor')
    expect(getParams()).not.toHaveProperty('accentColor')

    act(() => { respond() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry!.body).toBeDefined()
    expect(result.current.geometry!.handle).not.toBeNull()
  })

  it('não rebuilda ao trocar as cores', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    const calls = getCalls()
    act(() => {
      result.current.updateParam('bodyColor', '#ef4444')
      result.current.updateParam('accentColor', '#171717')
    })
    act(() => { vi.advanceTimersByTime(260) })
    expect(getCalls()).toBe(calls)
  })

  it('mantém a geometria anterior e define erro quando o build falha', () => {
    const { factory, respond, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const previous = result.current.geometry

    act(() => { result.current.updateParam('height', 100) })
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail('mug-csg') })

    expect(result.current.error).toBe(FRIENDLY_ERROR)
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).toBe(previous)
    expect(result.current.builtParams?.height).toBe(defaultMugParams.height)
  })

  it('limpa o erro no build seguinte', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail('mug-csg') })
    expect(result.current.error).toBe(FRIENDLY_ERROR)

    act(() => { result.current.updateParam('height', 100) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.error).toBeNull()
    expect(result.current.isBuilding).toBe(true)
  })

  it('define erro quando a fábrica de worker falha', () => {
    const factory = (): MugWorker => {
      throw new Error('worker indisponível')
    }
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.error).toBe(FRIENDLY_ERROR)
    expect(result.current.isBuilding).toBe(false)
  })

  it('expõe issues de validateMug', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { result.current.updateParam('textCenterY', 88) })
    expect(result.current.issues.some((issue) => issue.code === 'mug-text-band')).toBe(true)
  })

  it('reseta para os defaults', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('diameterTop', 100)
      result.current.updateParam('text', 'Ana')
    })
    act(() => { result.current.reset() })
    expect(result.current.params).toEqual(defaultMugParams)
    expect(result.current.issues).toEqual([])
    expect(result.current.capacityMl).toBeCloseTo(338, 0)
  })

  it('calcula dimensões do corpo e fitRadius com a alça', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    expect(result.current.dimensions).toEqual({
      width: 80,
      height: 88,
      thickness: defaultMugParams.wallThickness,
    })
    expect(result.current.fitRadius).toBeCloseTo(0.5 * Math.hypot(80, 88, 80), 2)
  })

  it('inclui a alça no fitRadius', () => {
    const { factory, respond } = makeWorkerFixture(serializedMugWithOffsetHandle)
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    const body = result.current.geometry!.body
    const handle = result.current.geometry!.handle!
    body.computeBoundingBox()
    handle.computeBoundingBox()
    const unionWidth = handle.boundingBox!.max.x - body.boundingBox!.min.x
    expect(unionWidth).toBeCloseTo(116, 0)
    expect(result.current.fitRadius).toBeCloseTo(0.5 * Math.hypot(unionWidth, 88, 80), 2)
  })

  it('posiciona a câmera no lado do texto', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    const distance = result.current.fitRadius * 2.2
    const elevation = (25 * Math.PI) / 180
    const azimuth = (210 * Math.PI) / 180
    const expected: [number, number, number] = [
      Number((distance * Math.sin(azimuth) * Math.cos(elevation)).toFixed(1)),
      Number((distance * Math.sin(elevation)).toFixed(1)),
      Number((distance * Math.cos(azimuth) * Math.cos(elevation)).toFixed(1)),
    ]
    expect(result.current.cameraPosition).toEqual(expected)
    expect(result.current.cameraPosition[0]).toBeLessThan(0)
    expect(result.current.cameraPosition[2]).toBeLessThan(0)
  })

  it('expõe os parâmetros exatos que geraram a geometria atual', () => {
    const { factory, respond, getParams } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    expect(result.current.builtParams).toBeNull()

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    expect(result.current.builtParams).toEqual(getParams())
    expect(result.current.builtParams?.diameterTop).toBe(defaultMugParams.diameterTop)

    act(() => { result.current.updateParam('diameterTop', 95) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.builtParams?.diameterTop).toBe(defaultMugParams.diameterTop)

    act(() => { respond() })
    expect(result.current.builtParams?.diameterTop).toBe(95)
    expect(result.current.builtParams).toEqual(getParams())
  })

  it('termina o worker anterior em um novo build', () => {
    const { factory, terminate } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { result.current.updateParam('height', 100) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(terminate).toHaveBeenCalled()
  })

  it('ignora o resultado de um build obsoleto', () => {
    const { factory, respond, respondFirst } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { result.current.updateParam('height', 100) })
    act(() => { vi.advanceTimersByTime(260) })

    act(() => { respondFirst() })
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(true)

    act(() => { respond() })
    expect(result.current.geometry).not.toBeNull()
  })

  it('descarta a geometria anterior ao aplicar uma nova', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const first = result.current.geometry!
    const disposeBody = vi.spyOn(first.body, 'dispose')
    const disposeHandle = vi.spyOn(first.handle!, 'dispose')

    act(() => { result.current.updateParam('height', 100) })
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    expect(disposeBody).toHaveBeenCalled()
    expect(disposeHandle).toHaveBeenCalled()
  })

  it('descarta a geometria e termina o worker ao desmontar', () => {
    const { factory, terminate, respond } = makeWorkerFixture()
    const { result, unmount } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const disposeBody = vi.spyOn(result.current.geometry!.body, 'dispose')
    const disposeHandle = vi.spyOn(result.current.geometry!.handle!, 'dispose')

    unmount()
    expect(disposeBody).toHaveBeenCalled()
    expect(disposeHandle).toHaveBeenCalled()
    expect(terminate).toHaveBeenCalled()
  })

  it('agrupa mudanças simultâneas em um único build', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useMug({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    const calls = getCalls()
    act(() => {
      result.current.updateParam('diameterTop', 90)
      result.current.updateParam('height', 100)
    })
    act(() => { vi.advanceTimersByTime(260) })
    expect(getCalls()).toBe(calls + 1)
  })
})
