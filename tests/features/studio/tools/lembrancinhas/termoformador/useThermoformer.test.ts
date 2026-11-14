import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BoxGeometry, CylinderGeometry } from 'three'
import { useThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/useThermoformer'
import {
  defaultThermoformerParams,
  type ThermoformerGeometryParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import {
  serializeGeometry,
  type SerializedGeometry,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'
import type { ScreenWorker } from '@/features/studio/tools/lembrancinhas/termoformador/workerClient'

function serializedScreen(): SerializedGeometry {
  return serializeGeometry(new BoxGeometry(160, 3, 120)).data
}

function serializedDisc(): SerializedGeometry {
  return serializeGeometry(new CylinderGeometry(80, 80, 3, 64)).data
}

function makeWorkerFixture(serialize: () => SerializedGeometry = serializedScreen) {
  let lastParams: ThermoformerGeometryParams | null = null
  let calls = 0
  const pendings: Array<(data: SerializedGeometry) => void> = []
  const failures: Array<() => void> = []
  const terminate = vi.fn()
  const factory = (): ScreenWorker => {
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
    fail: () => failures[failures.length - 1]?.(),
    getParams: () => lastParams,
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
    expect(result.current.fitRadius).toBeCloseTo(113.1, 1)
  })

  it('faz clamp dos campos numéricos', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('diameter', 999)
      result.current.updateParam('thickness', 0.1)
      result.current.updateParam('lineWidth', 9)
      result.current.updateParam('opening', 1)
    })
    expect(result.current.params.diameter).toBe(300)
    expect(result.current.params.thickness).toBe(1.2)
    expect(result.current.params.lineWidth).toBe(4)
    expect(result.current.params.opening).toBe(3)
  })

  it('envia ao worker após o debounce e aplica a geometria', () => {
    const { factory, respond, getParams, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(200) })
    expect(getCalls()).toBe(0)
    act(() => { vi.advanceTimersByTime(60) })
    expect(result.current.isBuilding).toBe(true)
    expect(getParams()).toEqual({
      productType: 'termoformador',
      diameter: 160,
      thickness: 3,
      frameWidth: 6,
      lineWidth: 0.4,
      opening: 6,
    })

    act(() => { respond() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.dimensions).toEqual({ width: 160, height: 120, thickness: 3 })
    // Fixture BoxGeometry(160, 3, 120): esfera envolvente de hypot(80, 1.5, 60).
    expect(result.current.fitRadius).toBeCloseTo(Math.hypot(80, 1.5, 60), 1)
  })

  it('enquadra pelo raio da esfera, não pela diagonal da AABB', () => {
    const { factory, respond } = makeWorkerFixture(serializedDisc)
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    expect(result.current.fitRadius).toBeCloseTo(80, 1)
    expect(result.current.fitRadius).toBeLessThan(100)
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
    const dispose = vi.spyOn(first, 'dispose')

    act(() => { result.current.updateParam('diameter', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    expect(dispose).toHaveBeenCalledTimes(1)
    expect(result.current.geometry).not.toBe(first)
  })

  it('descarta a geometria e termina o worker ao desmontar', () => {
    const { factory, respond, terminate } = makeWorkerFixture()
    const { result, unmount } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const geometry = result.current.geometry!
    const dispose = vi.spyOn(geometry, 'dispose')

    unmount()

    expect(dispose).toHaveBeenCalledTimes(1)
    expect(terminate).toHaveBeenCalled()
  })
})
