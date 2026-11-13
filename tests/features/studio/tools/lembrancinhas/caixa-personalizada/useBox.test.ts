import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BoxGeometry } from 'three'
import { useBox } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/useBox'
import {
  defaultBoxParams,
  type BoxGeometryParams,
} from '@/features/studio/tools/lembrancinhas/caixa-personalizada/schema'
import {
  serializeBuildResult,
  type SerializedBuildResult,
} from '@/features/studio/tools/lembrancinhas/caixa-personalizada/workerGeometry'
import type { BoxWorker } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/workerClient'

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
  let lastParams: BoxGeometryParams | null = null
  let calls = 0
  const pendings: Array<(data: SerializedBuildResult) => void> = []
  const failures: Array<() => void> = []
  const terminate = vi.fn()
  const factory = (): BoxWorker => {
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
    respond: () => pendings[pendings.length - 1]?.(serializedResult()),
    respondFirst: () => pendings[0]?.(serializedResult()),
    fail: () => failures[failures.length - 1]?.(),
    getParams: () => lastParams,
  }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('useBox', () => {
  it('retorna os defaults', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    expect(result.current.params).toEqual(defaultBoxParams)
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(false)
  })

  it('faz clamp dos campos numéricos', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
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
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.isBuilding).toBe(true)
    act(() => { respond() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry!.body).toBeDefined()
    expect(result.current.geometry!.lid).not.toBeNull()
  })

  it('expõe os parâmetros exatos que geraram a geometria atual', () => {
    const { factory, respond, getParams } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    expect(result.current.builtParams).toBeNull()

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    expect(result.current.builtParams?.width).toBe(defaultBoxParams.width)
    expect(result.current.builtParams).toEqual(getParams())

    act(() => { result.current.updateParam('width', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.builtParams?.width).toBe(defaultBoxParams.width)

    act(() => { respond() })
    expect(result.current.builtParams?.width).toBe(200)
    expect(result.current.builtParams).toEqual(getParams())
  })

  it('mantém os parâmetros anteriores quando o novo build falha', () => {
    const { factory, respond, fail, getParams } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    expect(result.current.builtParams?.width).toBe(defaultBoxParams.width)
    expect(result.current.builtParams).toEqual(getParams())

    act(() => { result.current.updateParam('width', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail() })

    expect(result.current.error).toBe('Falha ao gerar a geometria')
    expect(result.current.builtParams?.width).toBe(defaultBoxParams.width)
    expect(result.current.builtParams).not.toEqual(getParams())
  })

  it('expõe erro quando o worker falha', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBe('Falha ao gerar a geometria')
  })

  it('troca de cor não rebuilda', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
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
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    const calls = getCalls()
    act(() => { result.current.updateParam('width', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(getCalls()).toBeGreaterThan(calls)
    expect(getParams()?.width).toBe(200)
  })

  it('calcula dimensões e fitRadius após a geometria', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    expect(result.current.dimensions.width).toBeCloseTo(165, 0)
    expect(result.current.dimensions.height).toBeCloseTo(63, 0)
    expect(result.current.dimensions.thickness).toBeCloseTo(125, 0)
    expect(result.current.fitRadius).toBeGreaterThan(0)
  })

  it('reseta para os defaults e expõe issues', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { result.current.updateParam('width', 300) })
    act(() => { result.current.reset() })
    expect(result.current.params).toEqual(defaultBoxParams)
    expect(result.current.issues).toEqual([])
  })

  it('termina o worker anterior em um novo build', () => {
    const { factory, terminate } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { result.current.updateParam('width', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(terminate).toHaveBeenCalled()
  })

  it('ignora o resultado de um build obsoleto', () => {
    const { factory, respond, respondFirst } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { result.current.updateParam('width', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respondFirst() })
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(true)
    act(() => { respond() })
    expect(result.current.geometry).not.toBeNull()
  })

  it('descarta a geometria anterior ao aplicar uma nova', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const first = result.current.geometry!
    const dispose = vi.spyOn(first.body, 'dispose')
    act(() => { result.current.updateParam('width', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    expect(dispose).toHaveBeenCalled()
  })

  it('descarta a geometria e termina o worker ao desmontar', () => {
    const { factory, terminate, respond } = makeWorkerFixture()
    const { result, unmount } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const dispose = vi.spyOn(result.current.geometry!.body, 'dispose')
    unmount()
    expect(dispose).toHaveBeenCalled()
    expect(terminate).toHaveBeenCalled()
  })

  it('agrupa mudanças simultâneas em um único build', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    const calls = getCalls()
    act(() => {
      result.current.updateParam('width', 200)
      result.current.updateParam('depth', 200)
    })
    act(() => { vi.advanceTimersByTime(260) })
    expect(getCalls()).toBe(calls + 1)
  })

  it('limpa o erro no build seguinte', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail() })
    expect(result.current.error).toBe('Falha ao gerar a geometria')
    act(() => { result.current.updateParam('width', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.error).toBeNull()
    expect(result.current.isBuilding).toBe(true)
  })

  it('expõe issues de validação dos parâmetros geométricos', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('width', 60)
      result.current.updateParam('cornerRadius', 40)
    })
    expect(result.current.issues.some((issue) => issue.code === 'corner-radius')).toBe(true)
  })

  it('expõe erro quando a fábrica de worker falha', () => {
    const factory = (): BoxWorker => {
      throw new Error('worker indisponível')
    }
    const { result } = renderHook(() => useBox({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.error).toBe('Falha ao gerar a geometria')
    expect(result.current.isBuilding).toBe(false)
  })
})
