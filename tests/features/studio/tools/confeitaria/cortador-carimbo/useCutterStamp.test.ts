import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ExtrudeGeometry, Shape, Vector2 } from 'three'
import { useCutterStamp } from '@/features/studio/tools/confeitaria/cortador-carimbo/useCutterStamp'
import { defaultCutterStampParams } from '@/features/studio/tools/confeitaria/cortador-carimbo/schema'
import { serializeBuildResult, type SerializedBuildResult } from '@/features/studio/tools/confeitaria/cortador-carimbo/workerGeometry'
import type { GeometryWorker } from '@/features/studio/tools/confeitaria/cortador-carimbo/workerClient'
import type { ParsedSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'

function rect(minX: number, maxX: number, depth: number): ExtrudeGeometry {
  const shape = new Shape([
    new Vector2(minX, -5),
    new Vector2(maxX, -5),
    new Vector2(maxX, 5),
    new Vector2(minX, 5),
  ])
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false })
}

function serializedResult(): SerializedBuildResult {
  return serializeBuildResult({
    cutter: rect(-26.2, 26.2, 25),
    stampBase: rect(5, 54.2, 8),
    stampRelief: rect(10, 45, 2),
    stampHandle: rect(20, 40, 12),
  }).data
}

// Worker falso controlável: guarda os callbacks e só responde quando o teste mandar.
function makeWorkerFixture() {
  let pending: ((data: SerializedBuildResult) => void) | null = null
  let fail: (() => void) | null = null
  let lastParsed: ParsedSvg | null | undefined
  const terminate = vi.fn()
  const factory = (): GeometryWorker => ({
    build: (_params, _fontUrl, parsedSvg, onResult, onError) => {
      lastParsed = parsedSvg
      pending = onResult
      fail = onError ?? null
    },
    terminate,
  })
  return {
    factory,
    terminate,
    respond: () => pending?.(serializedResult()),
    fail: () => fail?.(),
    getParsed: () => lastParsed,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCutterStamp', () => {
  it('retorna os parâmetros padrão', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    expect(result.current.params).toEqual(defaultCutterStampParams)
  })

  it('começa sem geometria e sem build em andamento', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(false)
  })

  it('atualiza um parâmetro', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('textHeight', 40)
    })
    expect(result.current.params.textHeight).toBe(40)
  })

  it('faz clamp dos parâmetros numéricos', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('textHeight', 100)
      result.current.updateParam('baseMargin', 20)
      result.current.updateParam('iconScale', 2)
      result.current.updateParam('iconLineWidth', 9)
    })
    expect(result.current.params.textHeight).toBe(60)
    expect(result.current.params.baseMargin).toBe(10)
    expect(result.current.params.iconScale).toBe(1)
    expect(result.current.params.iconLineWidth).toBe(1.5)
  })

  it('define o ícone SVG', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('contentType', 'svg')
    })
    act(() => {
      result.current.setSvgIcon('<svg/>')
    })
    expect(result.current.params.svgIcon).toBe('<svg/>')
  })

  it('remove o ícone SVG mesmo com contentType svg', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('contentType', 'svg')
    })
    act(() => {
      result.current.setSvgIcon(SVG)
    })
    expect(result.current.params.svgIcon).toBe(SVG)

    act(() => {
      result.current.setSvgIcon(null)
    })
    expect(result.current.params.svgIcon).toBeNull()
  })

  it('parseia o SVG na main thread e envia ao worker', () => {
    const { factory, getParsed } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('contentType', 'svg')
    })
    act(() => {
      result.current.setSvgIcon(SVG)
    })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(getParsed()).not.toBeNull()
    expect(getParsed()!.fills.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('expõe erro quando o SVG não tem formas', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('contentType', 'svg')
    })
    act(() => {
      result.current.setSvgIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>')
    })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.error).toBe('Não foi possível ler o SVG')
  })

  it('marca isBuilding e define a geometria quando o worker responde', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('textHeight', 40)
    })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.isBuilding).toBe(true)

    act(() => {
      respond()
    })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry!.cutter).toBeDefined()
  })

  it('reseta isBuilding quando o worker falha', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.isBuilding).toBe(true)
    act(() => {
      fail()
    })
    expect(result.current.isBuilding).toBe(false)
  })

  it('reporta dimensões após a geometria', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    expect(result.current.dimensions.width).toBeCloseTo(80.4, 1)
    expect(result.current.dimensions.height).toBe(25)
    expect(result.current.dimensions.thickness).toBe(defaultCutterStampParams.wallThickness)
  })

  it('posiciona a câmera girada 210° no eixo Y', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    const [x, y, z] = result.current.cameraPosition
    expect(x).toBeLessThan(0)
    expect(y).toBeGreaterThan(0)
    expect(z).toBeLessThan(0)
  })

  it('a câmera é proporcional ao tamanho do objeto', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCutterStamp({ workerFactory: factory }))
    const initial = result.current.cameraPosition[1]
    act(() => {
      result.current.updateParam('textHeight', 60)
    })
    expect(result.current.cameraPosition[1]).toBeGreaterThan(initial)
  })
})
