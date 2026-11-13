import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BoxGeometry } from 'three'
import { useThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/useThermoformer'
import {
  defaultThermoformerParams,
  type ThermoformerGeometryParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import {
  serializeBuildResult,
  type SerializedBuildResult,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'
import type { ThermoformerWorker } from '@/features/studio/tools/lembrancinhas/termoformador/workerClient'

function serializedResult(): SerializedBuildResult {
  return serializeBuildResult({
    body: new BoxGeometry(160, 63, 120),
    lid: new BoxGeometry(165, 14, 125),
    frontPanel: new BoxGeometry(140, 50, 3),
    handle: new BoxGeometry(25, 16, 16),
    base: new BoxGeometry(165, 6, 125),
  }).data
}

function makeWorkerFixture() {
  let pending: ((data: SerializedBuildResult) => void) | null = null
  let fail: (() => void) | null = null
  let lastParams: ThermoformerGeometryParams | null = null
  let calls = 0
  const terminate = vi.fn()
  const factory = (): ThermoformerWorker => {
    calls++
    return {
      build: (params, onResult, onError) => {
        lastParams = params
        pending = onResult
        fail = onError ?? null
      },
      terminate,
    }
  }
  return {
    factory,
    terminate,
    getCalls: () => calls,
    respond: () => pending?.(serializedResult()),
    fail: () => fail?.(),
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
  })

  it('faz clamp dos campos numéricos', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('width', 999)
      result.current.updateParam('height', 1)
      result.current.updateParam('edgeChamfer', 9)
      result.current.updateParam('handleHeight', 2)
    })
    expect(result.current.params.width).toBe(300)
    expect(result.current.params.height).toBe(20)
    expect(result.current.params.edgeChamfer).toBe(3)
    expect(result.current.params.handleHeight).toBe(1)
  })

  it('envia ao worker após o debounce e aplica o resultado', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.isBuilding).toBe(true)
    act(() => { respond() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry!.body).toBeDefined()
    expect(result.current.geometry!.lid).not.toBeNull()
  })

  it('expõe erro quando o worker falha', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBe('Falha ao gerar a geometria')
  })

  it('troca de cor não rebuilda', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    const calls = getCalls()
    act(() => {
      result.current.updateParam('bodyColor', '#ef4444')
      result.current.updateParam('accentColor', '#171717')
    })
    act(() => { vi.advanceTimersByTime(260) })
    expect(getCalls()).toBe(calls)
  })

  it('mudança geométrica rebuilda e envia o parâmetro', () => {
    const { factory, getParams, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    const calls = getCalls()
    act(() => { result.current.updateParam('width', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(getCalls()).toBeGreaterThan(calls)
    expect(getParams()?.width).toBe(200)
  })

  it('calcula dimensões e fitRadius após a geometria', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    expect(result.current.dimensions.width).toBeCloseTo(165, 0)
    expect(result.current.dimensions.height).toBeCloseTo(63, 0)
    expect(result.current.dimensions.thickness).toBeCloseTo(125, 0)
    expect(result.current.fitRadius).toBeGreaterThan(0)
  })

  it('reseta para os defaults e expõe issues', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { result.current.updateParam('width', 300) })
    act(() => { result.current.reset() })
    expect(result.current.params).toEqual(defaultThermoformerParams)
    expect(result.current.issues).toEqual([])
  })

  it('termina o worker anterior em um novo build', () => {
    const { factory, terminate } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { result.current.updateParam('width', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(terminate).toHaveBeenCalled()
  })
})
