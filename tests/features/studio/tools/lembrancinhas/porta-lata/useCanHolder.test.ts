import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BoxGeometry } from 'three'
import { useCanHolder } from '@/features/studio/tools/lembrancinhas/porta-lata/useCanHolder'
import {
  defaultCanHolderParams,
  MAX_TEXT_LENGTH,
  type CanHolderGeometryParams,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import {
  serializeBuildResult,
  type CanHolderErrorCode,
  type SerializedBuildResult,
} from '@/features/studio/tools/lembrancinhas/porta-lata/workerGeometry'
import type { CanHolderWorker } from '@/features/studio/tools/lembrancinhas/porta-lata/workerClient'

const BUILD_ERROR = 'Falha ao gerar a geometria'
const CSG_ERROR = 'Falha ao gerar o relevo. Tente outro texto.'
const ELEVATION = (25 * Math.PI) / 180

function serializedCanHolder(): SerializedBuildResult {
  return serializeBuildResult({
    body: new BoxGeometry(80, 88, 80),
    handle: new BoxGeometry(52, 43, 12),
  }).data
}

function serializedCanHolderWithOffsetHandle(): SerializedBuildResult {
  return serializeBuildResult({
    body: new BoxGeometry(80, 88, 80),
    handle: new BoxGeometry(52, 43, 12).translate(50, 0, 0),
  }).data
}

function serializedCanHolderWithoutHandle(): SerializedBuildResult {
  return serializeBuildResult({
    body: new BoxGeometry(80, 88, 80),
    handle: null,
  }).data
}

interface WorkerInstance {
  build: CanHolderWorker['build']
  terminate: Mock
  pendings: Array<(data: SerializedBuildResult) => void>
  failures: Array<(code?: CanHolderErrorCode) => void>
}

function makeWorkerFixture(
  serialize: () => SerializedBuildResult = serializedCanHolder,
) {
  let lastParams: CanHolderGeometryParams | null = null
  const instances: WorkerInstance[] = []
  const factory = (): CanHolderWorker => {
    const pendings: WorkerInstance['pendings'] = []
    const failures: WorkerInstance['failures'] = []
    const build: CanHolderWorker['build'] = (params, onResult, onError) => {
      lastParams = params
      pendings.push(onResult)
      failures.push(onError ?? (() => undefined))
    }
    const instance: WorkerInstance = {
      build,
      terminate: vi.fn(),
      pendings,
      failures,
    }
    instances.push(instance)
    return { build, terminate: instance.terminate }
  }
  return {
    factory,
    getInstances: () => instances,
    getCalls: () => instances.length,
    respond: () => {
      const instance = instances.at(-1)
      instance?.pendings.at(-1)?.(serialize())
    },
    respondWith: (data: SerializedBuildResult) => {
      instances.at(-1)?.pendings.at(-1)?.(data)
    },
    respondFirst: () => instances[0]?.pendings[0]?.(serialize()),
    fail: (code?: CanHolderErrorCode) => {
      instances.at(-1)?.failures.at(-1)?.(code)
    },
    failFirst: (code?: CanHolderErrorCode) => {
      instances[0]?.failures[0]?.(code)
    },
    getParams: () => lastParams,
  }
}

function expectCameraInvariants(
  position: [number, number, number],
  fitRadius: number,
): void {
  const [x, y, z] = position
  expect(Math.hypot(x, y, z)).toBeCloseTo(2.2 * fitRadius, 0)
  expect(Math.abs(y) / Math.hypot(x, z)).toBeCloseTo(Math.tan(ELEVATION), 2)
  expect(x).toBeLessThan(0)
  expect(z).toBeLessThan(0)
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useCanHolder', () => {
  it('retorna os defaults e a capacidade', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    expect(result.current.params).toEqual(defaultCanHolderParams)
    expect(result.current.geometry).toBeNull()
    expect(result.current.builtParams).toBeNull()
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.issues).toEqual([])
    expect(result.current.capacityMl).toBeCloseTo(338, 0)
  })

  it('faz clamp dos campos numéricos', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
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
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { result.current.updateParam('text', 'x'.repeat(MAX_TEXT_LENGTH + 12)) })
    expect(result.current.params.text).toHaveLength(MAX_TEXT_LENGTH)
    expect(result.current.params.text).toBe('x'.repeat(MAX_TEXT_LENGTH))
  })

  it('trunca o texto por code points sem quebrar pares', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { result.current.updateParam('text', '🎉'.repeat(MAX_TEXT_LENGTH + 5)) })
    expect(result.current.params.text).toBe('🎉'.repeat(MAX_TEXT_LENGTH))
  })

  it('mantém handleEnabled booleano', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { result.current.updateParam('handleEnabled', false) })
    expect(result.current.params.handleEnabled).toBe(false)
    act(() => { result.current.updateParam('handleEnabled', true) })
    expect(result.current.params.handleEnabled).toBe(true)
    act(() => { result.current.updateParam('handleEnabled', 0) })
    expect(result.current.params.handleEnabled).toBe(true)
  })

  it('expõe dimensões, fitRadius e câmera finitos antes do primeiro build', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))

    const { dimensions, fitRadius, cameraPosition } = result.current
    expect(dimensions).toEqual({
      width: 80,
      height: 88,
      thickness: defaultCanHolderParams.wallThickness,
    })
    expect(Number.isFinite(fitRadius)).toBe(true)
    expect(fitRadius).toBeGreaterThan(0)
    for (const value of [...Object.values(dimensions), ...cameraPosition]) {
      expect(Number.isFinite(value)).toBe(true)
    }
    expectCameraInvariants(cameraPosition, fitRadius)
  })

  it('envia ao worker após o debounce sem as cores', () => {
    const { factory, getCalls, getParams, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(200) })
    expect(getCalls()).toBe(0)

    act(() => { vi.advanceTimersByTime(60) })
    expect(getCalls()).toBe(1)
    expect(result.current.isBuilding).toBe(true)
    expect(result.current.error).toBeNull()
    expect(getParams()).toEqual({
      productType: 'porta-lata',
      diameterTop: 80,
      diameterBottom: 72,
      height: 88,
      cavityDepth: 108,
      canClearance: 0.8,
      wallThickness: 2.4,
      bottomThickness: 3.2,
      ventHoleDiameter: 10,
      rimLeadIn: 1.0,
      rimChamfer: 0.4,
      handleEnabled: true,
      handleHeight: 60,
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

  it('não cria worker nem deixa timer quando desmonta durante o debounce', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { unmount } = renderHook(() => useCanHolder({ workerFactory: factory }))

    unmount()
    act(() => { vi.advanceTimersByTime(300) })

    expect(getCalls()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('não rebuilda ao trocar as cores', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
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
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const previous = result.current.geometry

    act(() => { result.current.updateParam('height', 100) })
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail('can-csg') })

    expect(result.current.error).toBe(CSG_ERROR)
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).toBe(previous)
    expect(result.current.builtParams?.height).toBe(defaultCanHolderParams.height)
  })

  it('mapeia os códigos de falha do worker em mensagens amigáveis', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))

    const cases: Array<{ code?: CanHolderErrorCode; message: string }> = [
      { code: 'can-csg', message: CSG_ERROR },
      { code: 'can-font', message: 'Falha ao carregar a fonte.' },
      { code: 'can-invalid', message: 'Parâmetros inválidos.' },
      { code: 'can-build', message: BUILD_ERROR },
      { message: BUILD_ERROR },
    ]

    for (const [index, testCase] of cases.entries()) {
      if (index > 0) {
        act(() => { result.current.updateParam('height', 90 + index) })
      }
      act(() => { vi.advanceTimersByTime(260) })
      act(() => { fail(testCase.code) })
      expect(result.current.error).toBe(testCase.message)
    }
  })

  it('limpa o erro no build seguinte', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail('can-csg') })
    expect(result.current.error).toBe(CSG_ERROR)

    act(() => { result.current.updateParam('height', 100) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.error).toBeNull()
    expect(result.current.isBuilding).toBe(true)
  })

  it('define erro quando a fábrica de worker falha', () => {
    const factory = (): CanHolderWorker => {
      throw new Error('worker indisponível')
    }
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.error).toBe(BUILD_ERROR)
    expect(result.current.isBuilding).toBe(false)
  })

  it('expõe issues de validateCanHolder', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('cavityDepth', 80)
      result.current.updateParam('textCenterY', 90)
      result.current.updateParam('textSize', 18)
    })
    expect(result.current.issues.some((issue) => issue.code === 'can-text-band')).toBe(true)
  })

  it('reseta para os defaults', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('diameterTop', 100)
      result.current.updateParam('text', 'Ana')
    })
    act(() => { result.current.reset() })
    expect(result.current.params).toEqual(defaultCanHolderParams)
    expect(result.current.params).not.toBe(defaultCanHolderParams)
    expect(result.current.issues).toEqual([])
    expect(result.current.capacityMl).toBeCloseTo(338, 0)
  })

  it('calcula dimensões do corpo e fitRadius com a alça', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    expect(result.current.dimensions).toEqual({
      width: 80,
      height: 88,
      thickness: defaultCanHolderParams.wallThickness,
    })
    expect(result.current.fitRadius).toBeCloseTo(0.5 * Math.hypot(80, 88, 80), 2)
  })

  it('inclui a alça no fitRadius', () => {
    const { factory, respond } = makeWorkerFixture(serializedCanHolderWithOffsetHandle)
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
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

  it('usa o snapshot da parede nas dimensões', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    act(() => { result.current.updateParam('wallThickness', 4) })
    expect(result.current.dimensions.thickness).toBe(defaultCanHolderParams.wallThickness)

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    expect(result.current.dimensions.thickness).toBe(4)
  })

  it('aceita build sem alça', () => {
    const { factory, respond, getParams } = makeWorkerFixture(serializedCanHolderWithoutHandle)
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { result.current.updateParam('handleEnabled', false) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(getParams()?.handleEnabled).toBe(false)

    act(() => { respond() })
    expect(result.current.geometry!.handle).toBeNull()
    expect(result.current.fitRadius).toBeCloseTo(0.5 * Math.hypot(80, 88, 80), 2)
    expect(Number.isFinite(result.current.fitRadius)).toBe(true)
    expect(result.current.dimensions).toEqual({
      width: 80,
      height: 88,
      thickness: defaultCanHolderParams.wallThickness,
    })
  })

  it('cai no fallback quando a caixa da geometria não é finita', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { factory, respondWith } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => {
      respondWith({
        body: {
          position: new Float32Array([Number.NaN, Number.NaN, Number.NaN]),
          normal: new Float32Array([0, 0, 1]),
          index: null,
        },
        handle: null,
      })
    })

    expect(result.current.geometry).not.toBeNull()
    expect(result.current.dimensions).toEqual({
      width: 80,
      height: 88,
      thickness: defaultCanHolderParams.wallThickness,
    })
    expect(Number.isFinite(result.current.fitRadius)).toBe(true)
    for (const value of result.current.cameraPosition) {
      expect(Number.isFinite(value)).toBe(true)
    }
  })

  it('não deixa o spinner travado quando a resposta do worker é inválida', () => {
    const { factory, respondWith } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => {
      respondWith({
        body: {
          position: null,
          normal: null,
          index: null,
        },
        handle: null,
      } as unknown as SerializedBuildResult)
    })

    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBe(BUILD_ERROR)
    expect(result.current.geometry).toBeNull()
  })

  it('posiciona a câmera no lado do texto', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    expectCameraInvariants(result.current.cameraPosition, result.current.fitRadius)
  })

  it('expõe os parâmetros exatos que geraram a geometria atual', () => {
    const { factory, respond, getParams } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    expect(result.current.builtParams).toBeNull()

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    expect(result.current.builtParams).toEqual(getParams())
    expect(result.current.builtParams?.diameterTop).toBe(defaultCanHolderParams.diameterTop)

    act(() => { result.current.updateParam('diameterTop', 95) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.builtParams?.diameterTop).toBe(defaultCanHolderParams.diameterTop)

    act(() => { respond() })
    expect(result.current.builtParams?.diameterTop).toBe(95)
    expect(result.current.builtParams).toEqual(getParams())
  })

  it('termina o worker anterior em um novo build', () => {
    const { factory, getInstances } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { result.current.updateParam('height', 100) })
    act(() => { vi.advanceTimersByTime(260) })

    const [first, second] = getInstances()
    expect(first.terminate).toHaveBeenCalledTimes(1)
    expect(second.terminate).not.toHaveBeenCalled()
  })

  it('ignora o resultado de um build obsoleto', () => {
    const { factory, respond, respondFirst } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { result.current.updateParam('height', 100) })
    act(() => { vi.advanceTimersByTime(260) })

    act(() => { respondFirst() })
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(true)

    act(() => { respond() })
    expect(result.current.geometry).not.toBeNull()
  })

  it('ignora o erro de um build obsoleto', () => {
    const { factory, failFirst } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { result.current.updateParam('height', 100) })
    act(() => { vi.advanceTimersByTime(260) })

    act(() => { failFirst('can-csg') })
    expect(result.current.error).toBeNull()
    expect(result.current.isBuilding).toBe(true)
  })

  it('descarta a geometria anterior ao aplicar uma nova', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
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
    const { factory, respond, getInstances } = makeWorkerFixture()
    const { result, unmount } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const disposeBody = vi.spyOn(result.current.geometry!.body, 'dispose')
    const disposeHandle = vi.spyOn(result.current.geometry!.handle!, 'dispose')

    unmount()
    expect(disposeBody).toHaveBeenCalled()
    expect(disposeHandle).toHaveBeenCalled()
    expect(getInstances()[0].terminate).toHaveBeenCalledTimes(1)
  })

  it('agrupa mudanças simultâneas em um único build', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
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
