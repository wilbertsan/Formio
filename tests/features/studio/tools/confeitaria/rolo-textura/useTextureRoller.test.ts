import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BoxGeometry } from 'three'
import { useTextureRoller } from '@/features/studio/tools/confeitaria/rolo-textura/useTextureRoller'
import { defaultTextureRollerParams, HANDLE_LENGTH_MM } from '@/features/studio/tools/confeitaria/rolo-textura/schema'
import { serializeBuildResult, type SerializedBuildResult } from '@/features/studio/tools/confeitaria/rolo-textura/workerGeometry'
import type { GeometryWorker } from '@/features/studio/tools/confeitaria/rolo-textura/workerClient'
import type { ParsedSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'

function serializedResult(): SerializedBuildResult {
  return serializeBuildResult({ roller: new BoxGeometry(150, 32, 32) }).data
}

function makeWorkerFixture() {
  let pending: ((data: SerializedBuildResult) => void) | null = null
  let fail: (() => void) | null = null
  let lastParsed: ParsedSvg | null | undefined
  let calls = 0
  const terminate = vi.fn()
  const factory = (): GeometryWorker => {
    calls++
    return {
      build: (_params, parsedSvg, onResult, onError) => {
        lastParsed = parsedSvg
        pending = onResult
        fail = onError ?? null
      },
      terminate,
    }
  }
  return { factory, terminate, getCalls: () => calls, respond: () => pending?.(serializedResult()), fail: () => fail?.(), getParsed: () => lastParsed }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('useTextureRoller', () => {
  it('retorna os parâmetros padrão', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    expect(result.current.params).toEqual(defaultTextureRollerParams)
  })

  it('começa sem geometria e sem build em andamento', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(false)
  })

  it('faz clamp de comprimento, diâmetro e profundidade', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('length', 999)
      result.current.updateParam('diameter', 1)
      result.current.updateParam('reliefDepth', 9)
    })
    expect(result.current.params.length).toBe(150)
    expect(result.current.params.diameter).toBe(20)
    expect(result.current.params.reliefDepth).toBe(2)
  })

  it('troca a família e ajusta o motivo', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { result.current.updateParam('patternFamily', 'floral') })
    expect(result.current.params.patternMotif).toBe('flower')
  })

  it('define e remove o SVG mesmo em patternSource svg', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { result.current.updateParam('patternSource', 'svg') })
    act(() => { result.current.setSvgIcon(SVG) })
    expect(result.current.params.svgIcon).toBe(SVG)
    act(() => { result.current.setSvgIcon(null) })
    expect(result.current.params.svgIcon).toBeNull()
  })

  it('parseia o SVG na main thread e envia ao worker', () => {
    const { factory, getParsed } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { result.current.updateParam('patternSource', 'svg') })
    act(() => { result.current.setSvgIcon(SVG) })
    act(() => { vi.advanceTimersByTime(250) })
    expect(getParsed()).not.toBeNull()
    expect(getParsed()!.fills.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('expõe erro quando o SVG não tem formas', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { result.current.updateParam('patternSource', 'svg') })
    act(() => { result.current.setSvgIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>') })
    act(() => { vi.advanceTimersByTime(250) })
    expect(result.current.error).toBe('Não foi possível ler o SVG')
  })

  it('marca isBuilding e define a geometria quando o worker responde', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(250) })
    expect(result.current.isBuilding).toBe(true)
    act(() => { respond() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry!.roller).toBeDefined()
  })

  it('reseta isBuilding e expõe erro quando o worker falha', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(250) })
    expect(result.current.isBuilding).toBe(true)
    act(() => { fail() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBe('Falha ao gerar a geometria')
  })

  it('aplica densidade, comprimento e cor com patternSource svg sem arquivo', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { result.current.updateParam('patternSource', 'svg') })
    act(() => {
      result.current.updateParam('density', 'high')
      result.current.updateParam('length', 120)
      result.current.updateParam('rollerColor', '#ef4444')
    })
    expect(result.current.params.density).toBe('high')
    expect(result.current.params.length).toBe(120)
    expect(result.current.params.rollerColor).toBe('#ef4444')
  })

  it('limpa a geometria ao selecionar svg sem arquivo', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(250) })
    act(() => { respond() })
    expect(result.current.geometry).not.toBeNull()
    act(() => { result.current.updateParam('patternSource', 'svg') })
    act(() => { vi.advanceTimersByTime(250) })
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(false)
  })

  it('limpa a geometria e expõe erro com SVG inválido', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(250) })
    act(() => { respond() })
    expect(result.current.geometry).not.toBeNull()
    act(() => { result.current.updateParam('patternSource', 'svg') })
    act(() => { result.current.setSvgIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>') })
    act(() => { vi.advanceTimersByTime(250) })
    expect(result.current.geometry).toBeNull()
    expect(result.current.error).toBe('Não foi possível ler o SVG')
  })

  it('cancela o build e reseta isBuilding ao remover o SVG', () => {
    const { factory, terminate } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { result.current.updateParam('patternSource', 'svg') })
    act(() => { result.current.setSvgIcon(SVG) })
    act(() => { vi.advanceTimersByTime(250) })
    expect(result.current.isBuilding).toBe(true)
    act(() => { result.current.setSvgIcon(null) })
    act(() => { vi.advanceTimersByTime(250) })
    expect(result.current.isBuilding).toBe(false)
    expect(terminate).toHaveBeenCalled()
  })

  it('não rebuilda ao trocar apenas cores', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(250) })
    const callsAfterInitial = getCalls()
    act(() => { result.current.updateParam('rollerColor', '#ef4444') })
    act(() => { result.current.updateParam('reliefColor', '#171717') })
    act(() => { vi.advanceTimersByTime(250) })
    expect(getCalls()).toBe(callsAfterInitial)
  })

  it('termina o worker anterior antes de um novo build', () => {
    const { factory, terminate } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(250) })
    act(() => { result.current.updateParam('length', 120) })
    act(() => { vi.advanceTimersByTime(250) })
    expect(terminate).toHaveBeenCalled()
  })

  it('reporta dimensões após a geometria', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(250) })
    act(() => { respond() })
    expect(result.current.dimensions.width).toBeCloseTo(150, 1)
    expect(result.current.dimensions.height).toBeCloseTo(32, 1)
    expect(result.current.dimensions.thickness).toBeCloseTo(32, 1)
  })

  it('usa fallback de dimensões antes da geometria', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    expect(result.current.dimensions.width).toBeCloseTo(defaultTextureRollerParams.length + 2 * HANDLE_LENGTH_MM, 1)
    expect(result.current.dimensions.height).toBeCloseTo(defaultTextureRollerParams.diameter + 2 * defaultTextureRollerParams.reliefDepth, 1)
  })

  it('reseta para os defaults', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
    act(() => { result.current.updateParam('length', 150) })
    act(() => { result.current.reset() })
    expect(result.current.params).toEqual(defaultTextureRollerParams)
  })
})
