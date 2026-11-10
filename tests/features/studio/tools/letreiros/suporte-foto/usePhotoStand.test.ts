import * as THREE from 'three'
import { act, renderHook } from '@testing-library/react'
import { usePhotoStand } from '@/features/studio/tools/letreiros/suporte-foto/usePhotoStand'
import { defaultPhotoStandParams } from '@/features/studio/tools/letreiros/suporte-foto/schema'
import {
  serializePhotoStandResult,
  type SerializedPhotoStandResult,
} from '@/features/studio/tools/letreiros/suporte-foto/workerGeometry'
import type {
  PhotoStandWorker,
  PhotoStandWorkerRequest,
} from '@/features/studio/tools/letreiros/suporte-foto/workerClient'

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'
const INVALID_SVG = 'não é svg'

function serialized(): SerializedPhotoStandResult {
  return serializePhotoStandResult({
    base: new THREE.BoxGeometry(120, 25, 40),
    content: new THREE.BoxGeometry(40, 8, 1),
    contentItems: [{ id: 'content-1', halfWidth: 20, halfHeight: 4 }],
  }).data
}

interface WorkerRecord {
  pending: ((data: SerializedPhotoStandResult) => void) | null
  fail: ((message: string) => void) | null
  terminate: ReturnType<typeof vi.fn>
}

function makeWorkerFixture() {
  const workers: WorkerRecord[] = []
  let lastRequest: PhotoStandWorkerRequest | null = null
  const factory = (): PhotoStandWorker => {
    const record: WorkerRecord = { pending: null, fail: null, terminate: vi.fn() }
    workers.push(record)
    return {
      build: (request, onResult, onError) => {
        lastRequest = request
        record.pending = onResult
        record.fail = onError ?? null
      },
      terminate: record.terminate,
    }
  }
  return {
    factory,
    workers,
    respond: (data: SerializedPhotoStandResult = serialized(), index = workers.length - 1) =>
      workers[index]?.pending?.(data),
    fail: (message = 'Falha ao gerar a peça', index = workers.length - 1) =>
      workers[index]?.fail?.(message),
    getRequest: () => lastRequest,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePhotoStand', () => {
  it('inicia com um conteúdo de texto', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    expect(result.current.params.contents).toHaveLength(1)
    const first = result.current.params.contents[0]
    expect(first.kind).toBe('text')
    if (first.kind === 'text') expect(first.content).toBe('Família')
  })

  it('expõe dimensões de fallback antes da geometria', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    expect(result.current.dimensions).toEqual({ width: 120, height: 25, thickness: 40 })
    expect(result.current.fitRadius).toBeGreaterThan(0)
  })

  it('enquadra a peça pela frente (face do conteúdo em +Z)', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    const [x, y, z] = result.current.cameraPosition
    expect(z).toBeGreaterThan(0)
    expect(x).toBeGreaterThan(0)
    expect(y).toBeGreaterThan(0)
  })

  it('mostra a profundidade efetiva quando o perfil exige mais base', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    act(() => result.current.updateParam('bandHeight', 40))
    act(() => result.current.updateParam('thickness', 4))
    act(() => result.current.updateParam('angle', 60))
    expect(result.current.dimensions.thickness).toBeGreaterThan(30)
  })

  it('updateParam clampa valores da peça', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    act(() => result.current.updateParam('sideMargin', 1))
    expect(result.current.params.sideMargin).toBe(3)
    act(() => result.current.updateParam('angle', 100))
    expect(result.current.params.angle).toBe(85)
    act(() => result.current.updateParam('photoSize', '15x20'))
    expect(result.current.params.photoSize).toBe('15x20')
    // sideMargin foi clampado para 3 acima: 150 + 2 * 3 = 156.
    expect(result.current.dimensions.width).toBe(156)
  })

  it('reset restaura defaults', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    act(() => result.current.updateParam('bandHeight', 35))
    act(() => result.current.reset())
    expect(result.current.params).toEqual(defaultPhotoStandParams)
  })

  it('addContent respeita o limite de 3 e retorna o id', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    act(() => {
      result.current.addContent()
      result.current.addContent()
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current.params.contents.length).toBeLessThanOrEqual(3)
    expect(result.current.addContent()).toBeNull()
  })

  it('removeContent não remove o último item', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    act(() => result.current.removeContent(result.current.params.contents[0].id))
    expect(result.current.params.contents).toHaveLength(1)
  })

  it('updateContent patcha e clampa valores', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { fontSize: 20, offsetX: 200 }))
    const item = result.current.params.contents[0]
    if (item.kind !== 'text') throw new Error('conteúdo inesperado')
    expect(item.fontSize).toBe(15)
    expect(item.offsetX).toBe(95)
  })

  it('troca o tipo de conteúdo preservando os offsets', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { offsetX: 5, offsetY: -3 }))
    act(() => result.current.setContentType(id, 'icon'))
    const item = result.current.params.contents[0]
    expect(item.kind).toBe('icon')
    expect(item.offsetX).toBe(5)
    expect(item.offsetY).toBe(-3)
  })

  it('gera a peça no worker após o debounce', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.isBuilding).toBe(true)
    expect(fixture.getRequest()?.params.productType).toBe('photo-stand')

    act(() => fixture.respond())
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.dimensions).toEqual({ width: 120, height: 25, thickness: 40 })
  })

  it('ignora resposta de worker obsoleto', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))

    act(() => {
      vi.advanceTimersByTime(200)
    })
    const staleIndex = fixture.workers.length - 1

    act(() => result.current.updateParam('bandHeight', 30))
    act(() => {
      vi.advanceTimersByTime(200)
    })

    act(() => fixture.respond(serialized(), staleIndex))
    expect(result.current.geometry).toBeNull()

    act(() => fixture.respond())
    expect(result.current.geometry).not.toBeNull()
  })

  it('informa erro quando o worker falha', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => fixture.fail('Falha ao gerar a peça'))
    expect(result.current.error).toBe('Falha ao gerar a peça')
    expect(result.current.isBuilding).toBe(false)
  })

  it('informa erro ao ler um SVG inválido', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))
    const id = result.current.params.contents[0].id

    act(() => result.current.setContentType(id, 'icon'))
    act(() => result.current.updateContent(id, { svgIcon: INVALID_SVG }))
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.error).toBe('Não foi possível ler o SVG')
  })

  it('envia o SVG parseado e os estilos usados ao worker', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))
    const id = result.current.params.contents[0].id

    act(() => result.current.setContentType(id, 'icon'))
    act(() => result.current.updateContent(id, { svgIcon: SVG }))
    act(() => {
      vi.advanceTimersByTime(200)
    })

    const request = fixture.getRequest()
    expect(request?.parsedSvgs[id]).toBeTruthy()
    expect(request?.styles).toEqual([])
  })

  it('trocar cor não reconstrói a geometria', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))

    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => fixture.respond())
    const workersAfterBuild = fixture.workers.length

    act(() => result.current.updateParam('baseColor', '#ef4444'))
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(fixture.workers.length).toBe(workersAfterBuild)
  })
})
