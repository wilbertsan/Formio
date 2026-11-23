import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BoxGeometry, CylinderGeometry } from 'three'
import { useThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/useThermoformer'
import {
  defaultThermoformerParams,
  type ThermoformerGeometryParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import {
  parseSvg,
  type ParsedSvg,
} from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import {
  serializeThermoformerResult,
  type SerializedThermoformerResult,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'
import type { ScreenWorker } from '@/features/studio/tools/lembrancinhas/termoformador/workerClient'

const triangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,5 95,95 5,95" fill="#000"/>
</svg>`

const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>`

const disjointSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="5" y="5" width="25" height="25" fill="#000"/>
  <rect x="70" y="70" width="25" height="25" fill="#000"/>
</svg>`

const splitSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="10,10 90,10 90,20 15,20 15,80 90,80 90,90 10,90" fill="#000"/>
</svg>`

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
  const failures: Array<(reason?: string) => void> = []
  const parsedSvgs: Array<ParsedSvg | null | undefined> = []
  const terminate = vi.fn()
  const factory = (): ScreenWorker => {
    calls++
    return {
      build: (params, parsedSvg, onResult, onError) => {
        lastParams = params
        lastParsedSvg = parsedSvg
        parsedSvgs.push(parsedSvg)
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
    fail: (reason?: string) => failures[failures.length - 1]?.(reason),
    getParams: () => lastParams,
    getParsedSvg: () => lastParsedSvg,
    getParsedSvgAll: () => parsedSvgs,
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

  it('envia a forma ao worker sem o svg bruto', () => {
    const { factory, getParams } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'square')
      result.current.updateParam('svg', '<svg/>')
    })
    act(() => { vi.advanceTimersByTime(260) })

    expect(getParams()).toMatchObject({ shape: 'square', svg: '' })
  })

  it('envia a forma quadrada e expõe o contorno poligonal', () => {
    const { factory, getParams } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'square')
      result.current.updateParam('width', 100)
    })
    act(() => { vi.advanceTimersByTime(260) })

    expect(getParams()).toMatchObject({ shape: 'square', width: 100 })
    expect(result.current.outline?.kind).toBe('polygon')
    expect(result.current.svgError).toBeNull()
    expect(result.current.plugLift).toBeCloseTo(28, 5)
    // O envelope do suporte vem do contorno: 100 + 2 × (4 + 0,3) = 108,6.
    expect(result.current.dimensions).toEqual({
      width: 108.6,
      height: 27,
      thickness: 108.6,
    })
  })

  it('usa largura e profundidade do contorno no retângulo', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'rectangle')
      result.current.updateParam('width', 140)
      result.current.updateParam('height', 80)
    })

    // 140 + 2 × 4,3 = 148,6 na largura; 80 + 8,6 = 88,6 na profundidade.
    expect(result.current.dimensions).toEqual({
      width: 148.6,
      height: 27,
      thickness: 88.6,
    })
  })

  it('parseia o svg na main thread e envia ao worker', () => {
    const { factory, respond, getParams, getParsedSvg } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'svg')
      result.current.setSvg(triangle)
    })
    act(() => { vi.advanceTimersByTime(260) })

    expect(getParams()).toMatchObject({ shape: 'svg', svg: '' })
    expect(getParsedSvg()).not.toBeNull()
    expect(getParsedSvg()).toEqual(parseSvg(triangle))
    expect(result.current.outline?.kind).toBe('polygon')
    expect(result.current.svgError).toBeNull()

    act(() => { respond() })
    expect(result.current.geometry).not.toBeNull()
  })

  it('reutiliza o parse do mesmo svg entre builds', () => {
    const { factory, respond, getParsedSvgAll, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'svg')
      result.current.setSvg(triangle)
    })
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    act(() => { result.current.updateParam('svgSize', 200) })
    act(() => { vi.advanceTimersByTime(260) })

    const parsed = getParsedSvgAll()
    expect(getCalls()).toBe(2)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).not.toBeNull()
    // Mesmo conteúdo: o cache devolve a mesma instância; o tamanho só rebuilda.
    expect(parsed[0]).toBe(parsed[1])
  })

  it('sinaliza svg com contornos desconexos', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'svg')
      result.current.setSvg(disjointSvg)
    })
    act(() => { vi.advanceTimersByTime(260) })

    expect(result.current.svgError?.code).toBe('svg-contour')
    expect(result.current.outline).toBeNull()
    expect(result.current.geometry).toBeNull()
    expect(getCalls()).toBe(0)
  })

  it('não chama o worker enquanto o svg estiver ausente', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { result.current.updateParam('shape', 'svg') })
    act(() => { vi.advanceTimersByTime(260) })

    expect(result.current.svgError?.code).toBe('svg-missing')
    expect(result.current.outline).toBeNull()
    expect(result.current.geometry).toBeNull()
    expect(result.current.dimensions).toEqual({ width: 0, height: 0, thickness: 0 })
    expect(result.current.plugLift).toBeCloseTo(28, 5)
    expect(getCalls()).toBe(0)
  })

  it('sinaliza svg ilegível e não chama o worker', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'svg')
      result.current.setSvg(emptySvg)
    })
    act(() => { vi.advanceTimersByTime(260) })

    expect(result.current.svgError?.code).toBe('svg-parse')
    expect(result.current.outline).toBeNull()
    expect(result.current.geometry).toBeNull()
    expect(getCalls()).toBe(0)
  })

  it('sinaliza svg ausente ao remover o arquivo', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'svg')
      result.current.setSvg(triangle)
    })
    act(() => { result.current.setSvg(null) })
    act(() => { vi.advanceTimersByTime(260) })

    expect(result.current.params.svg).toBe('')
    expect(result.current.svgError?.code).toBe('svg-missing')
    expect(result.current.geometry).toBeNull()
    expect(getCalls()).toBe(0)
  })

  it('descarta o build em voo quando o svg é removido', () => {
    const { factory, respond, terminate } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'svg')
      result.current.setSvg(triangle)
    })
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.isBuilding).toBe(true)

    act(() => { result.current.setSvg(null) })
    expect(terminate).toHaveBeenCalled()

    act(() => { respond() })
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(false)
  })

  it('descarta a geometria quando o svg fica inválido', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const first = result.current.geometry!
    const disposeScreen = vi.spyOn(first.screen, 'dispose')
    const disposeSupport = vi.spyOn(first.support, 'dispose')
    const disposePlug = vi.spyOn(first.plug, 'dispose')

    act(() => {
      result.current.updateParam('shape', 'svg')
      result.current.setSvg(emptySvg)
    })

    expect(result.current.geometry).toBeNull()
    expect(disposeScreen).toHaveBeenCalledTimes(1)
    expect(disposeSupport).toHaveBeenCalledTimes(1)
    expect(disposePlug).toHaveBeenCalledTimes(1)
  })

  it('traduz o erro de contorno inválido do worker', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail('invalid-outline') })

    expect(result.current.error).toBe('Contorno inválido para a forma selecionada')
    expect(result.current.isBuilding).toBe(false)
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

  it('valida a forma com o contorno derivado', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { result.current.updateParam('shape', 'square') })

    expect(result.current.outline?.kind).toBe('polygon')
    expect(result.current.issues).toContainEqual(
      expect.objectContaining({ code: 'support-step-clamped', severity: 'warning' }),
    )
  })

  it('expõe o erro do SVG na validação', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { result.current.updateParam('shape', 'svg') })

    expect(result.current.issues).toContainEqual(
      expect.objectContaining({ code: 'svg-missing', severity: 'error' }),
    )
  })

  it('expõe o contorno desconexo do SVG na validação', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'svg')
      result.current.setSvg(disjointSvg)
    })

    expect(result.current.issues).toContainEqual(
      expect.objectContaining({ code: 'svg-contour', severity: 'error' }),
    )
  })

  it('bloqueia o build quando os offsets do SVG dividem a silhueta', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'svg')
      result.current.setSvg(splitSvg)
    })
    act(() => { vi.advanceTimersByTime(260) })

    expect(result.current.issues).toContainEqual(
      expect.objectContaining({ code: 'svg-feature', severity: 'error' }),
    )
    expect(result.current.geometry).toBeNull()
    expect(getCalls()).toBe(0)
  })

  it('gera o SVG no tamanho máximo mesmo com o envelope do suporte maior', () => {
    const { factory, respond, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'svg')
      result.current.updateParam('svgSize', 300)
      result.current.setSvg(triangle)
    })
    act(() => { vi.advanceTimersByTime(260) })

    expect(
      result.current.issues.some((issue) => issue.code === 'svg-size'),
    ).toBe(false)
    expect(getCalls()).toBe(1)

    act(() => { respond() })
    expect(result.current.geometry).not.toBeNull()
  })

  it('restaura os padrões', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('shape', 'svg')
      result.current.setSvg(triangle)
    })
    act(() => { result.current.reset() })

    expect(result.current.params).toEqual(defaultThermoformerParams)
    expect(result.current.params.shape).toBe('circle')
    expect(result.current.params.svg).toBe('')
    expect(result.current.svgError).toBeNull()
    expect(result.current.outline?.kind).toBe('circle')
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
