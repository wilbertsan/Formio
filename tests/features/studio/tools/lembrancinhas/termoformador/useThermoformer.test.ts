import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BoxGeometry, CylinderGeometry } from 'three'
import { useThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/useThermoformer'
import {
  defaultThermoformerParams,
  type ThermoformerGeometryParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import type { ParsedSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import {
  serializeThermoformerResult,
  type SerializedThermoformerResult,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'
import type { ScreenWorker } from '@/features/studio/tools/lembrancinhas/termoformador/workerClient'

function serializedResult(): SerializedThermoformerResult {
  return serializeThermoformerResult({
    screen: new BoxGeometry(160, 3, 160),
    support: new BoxGeometry(168.6, 27, 168.6).translate(0, 13.5, 0),
    plug: new BoxGeometry(160, 46, 160).translate(0, 30, 0),
    seatY: 24,
  }).data
}

function serializedDisc(): SerializedThermoformerResult {
  return serializeThermoformerResult({
    screen: new CylinderGeometry(80, 80, 3, 64),
    support: new CylinderGeometry(84.3, 84.3, 27, 64).translate(0, 13.5, 0),
    plug: new CylinderGeometry(80, 80, 46, 64).translate(0, 30, 0),
    seatY: 24,
  }).data
}

function makeWorkerFixture(serialize: () => SerializedThermoformerResult = serializedResult) {
  let lastParams: ThermoformerGeometryParams | null = null
  let lastParsedSvg: ParsedSvg | null | undefined
  let calls = 0
  const pendings: Array<(data: SerializedThermoformerResult) => void> = []
  const failures: Array<() => void> = []
  const terminate = vi.fn()
  const factory = (): ScreenWorker => {
    calls++
    return {
      build: (params, parsedSvg, onResult, onError) => {
        lastParams = params
        lastParsedSvg = parsedSvg
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
    fail: () => failures[failures.length - 1]?.(),
    getParams: () => lastParams,
    getParsedSvg: () => lastParsedSvg,
  }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('useThermoformer', () => {
  it('retorna os defaults', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    expect(result.current.params).toEqual(defaultThermoformerParams)
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.issues).toHaveLength(0)
    expect(result.current.fitRadius).toBeCloseTo(120.0, 1)
  })

  it('faz clamp dos campos numéricos', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('diameter', 999)
      result.current.updateParam('thickness', 0.1)
      result.current.updateParam('lineWidth', 9)
      result.current.updateParam('opening', 1)
      result.current.updateParam('plugHeight', 99)
      result.current.updateParam('width', 999)
      result.current.updateParam('height', 999)
      result.current.updateParam('svgSize', 10)
      result.current.updateParam('draftAngle', -1)
      result.current.updateParam('pyramidTip', 1)
    })
    expect(result.current.params.diameter).toBe(300)
    expect(result.current.params.thickness).toBe(1.2)
    expect(result.current.params.lineWidth).toBe(4)
    expect(result.current.params.opening).toBe(3)
    expect(result.current.params.plugHeight).toBe(40)
    expect(result.current.params.width).toBe(300)
    expect(result.current.params.height).toBe(300)
    expect(result.current.params.svgSize).toBe(40)
    expect(result.current.params.draftAngle).toBe(0)
    expect(result.current.params.pyramidTip).toBe(0.3)
  })

  it('envia forma e svg ao worker', () => {
    const { factory, getParams } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'square')
      result.current.updateParam('svg', '<svg/>')
    })
    act(() => { vi.advanceTimersByTime(260) })

    expect(getParams()).toMatchObject({ shape: 'square', svg: '<svg/>' })
  })

  it('envia ao worker após o debounce e aplica a geometria', () => {
    const { factory, respond, getParams, getParsedSvg, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(200) })
    expect(getCalls()).toBe(0)
    act(() => { vi.advanceTimersByTime(60) })
    expect(result.current.isBuilding).toBe(true)
    expect(getParams()).toEqual({
      productType: 'termoformador',
      shape: 'circle',
      width: 160,
      height: 100,
      svgSize: 160,
      draftAngle: 5,
      pyramidTip: 0.1,
      svg: '',
      diameter: 160,
      thickness: 3,
      frameWidth: 6,
      lineWidth: 0.4,
      opening: 6,
      wallThickness: 4,
      bottomThickness: 4,
      bowlDepth: 20,
      stepWidth: 5,
      fitClearance: 0.3,
      edgeChamfer: 0.6,
      plugHeight: 26,
    })
    expect(getParsedSvg()).toBeNull()

    act(() => { respond() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry!.screen).toBeDefined()
    expect(result.current.geometry!.support).toBeDefined()
    expect(result.current.geometry!.plug).toBeDefined()
    expect(result.current.seatY).toBe(24)
    expect(result.current.plugLift).toBeCloseTo(28, 5)
    expect(result.current.dimensions).toEqual({
      width: 168.6,
      height: 27,
      thickness: 168.6,
    })
    // Suporte assentado (y=0..27) + macho em y=7..53 suspenso 28 mm.
    // Esfera centrada na origem: 40.5 + hypot(84.3, 40.5, 84.3) ≈ 166.41.
    expect(result.current.fitRadius).toBeCloseTo(166.41, 1)
  })

  it('usa a bounding box do suporte, não o fallback dos parâmetros', () => {
    const { factory, respond } = makeWorkerFixture(() =>
      serializeThermoformerResult({
        screen: new BoxGeometry(160, 3, 160),
        support: new BoxGeometry(180, 30, 140),
        plug: new BoxGeometry(160, 46, 160),
        seatY: 27,
      }).data,
    )
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    expect(result.current.dimensions).toEqual({ width: 180, height: 30, thickness: 140 })
    expect(result.current.seatY).toBe(27)
  })

  it('enquadra a união do suporte com o macho suspenso', () => {
    const { factory, respond } = makeWorkerFixture(serializedDisc)
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    expect(result.current.fitRadius).toBeCloseTo(166.41, 1)
    expect(result.current.fitRadius).toBeLessThan(247)
  })

  it('recalcula o afastamento com a profundidade efetiva', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('diameter', 60)
      result.current.updateParam('bowlDepth', 60)
    })

    // D=60, degrau 5, folga 0,3: a bacia é limitada a 25,3 mm; +8 = 33,3.
    expect(result.current.plugLift).toBeCloseTo(33.3, 1)
  })

  it('não rebuilda ao trocar apenas a cor', () => {
    const { factory, respond, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const calls = getCalls()

    act(() => { result.current.updateParam('color', '#ef4444') })
    act(() => { vi.advanceTimersByTime(260) })

    expect(result.current.params.color).toBe('#ef4444')
    expect(getCalls()).toBe(calls)
  })

  it('ignora o resultado de um build obsoleto', () => {
    const { factory, respond, respondFirst } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { result.current.updateParam('diameter', 200) })
    act(() => { vi.advanceTimersByTime(260) })

    act(() => { respondFirst() })
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(true)

    act(() => { respond() })
    expect(result.current.geometry).not.toBeNull()
  })

  it('mantém a geometria anterior quando o novo build falha', () => {
    const { factory, respond, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    expect(result.current.geometry).not.toBeNull()
    const first = result.current.geometry

    act(() => { result.current.updateParam('diameter', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail() })

    expect(result.current.geometry).toBe(first)
    expect(result.current.seatY).toBe(24)
    expect(result.current.error).toBe('Falha ao gerar a geometria')
    expect(result.current.isBuilding).toBe(false)
  })

  it('expõe as issues da validação', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('diameter', 60)
      result.current.updateParam('frameWidth', 30)
    })

    expect(result.current.issues).toContainEqual(
      expect.objectContaining({ code: 'screen-frame', severity: 'error' }),
    )
  })

  it('restaura os padrões', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { result.current.updateParam('diameter', 250) })
    act(() => { result.current.reset() })

    expect(result.current.params).toEqual(defaultThermoformerParams)
  })

  it('descarta a geometria anterior ao aplicar uma nova', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const first = result.current.geometry!
    const disposeScreen = vi.spyOn(first.screen, 'dispose')
    const disposeSupport = vi.spyOn(first.support, 'dispose')
    const disposePlug = vi.spyOn(first.plug, 'dispose')

    act(() => { result.current.updateParam('diameter', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    expect(disposeScreen).toHaveBeenCalledTimes(1)
    expect(disposeSupport).toHaveBeenCalledTimes(1)
    expect(disposePlug).toHaveBeenCalledTimes(1)
    expect(result.current.geometry).not.toBe(first)
  })

  it('descarta a geometria e termina o worker ao desmontar', () => {
    const { factory, respond, terminate } = makeWorkerFixture()
    const { result, unmount } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const geometry = result.current.geometry!
    const disposeScreen = vi.spyOn(geometry.screen, 'dispose')
    const disposeSupport = vi.spyOn(geometry.support, 'dispose')
    const disposePlug = vi.spyOn(geometry.plug, 'dispose')

    unmount()

    expect(disposeScreen).toHaveBeenCalled()
    expect(disposeSupport).toHaveBeenCalled()
    expect(disposePlug).toHaveBeenCalled()
    expect(terminate).toHaveBeenCalled()
  })
})
