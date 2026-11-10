import * as THREE from 'three'
import { act, renderHook } from '@testing-library/react'
import { useCard } from '@/features/studio/tools/letreiros/cartao-visita/useCard'
import { defaultCardParams } from '@/features/studio/tools/letreiros/cartao-visita/schema'
import {
  serializeCardResult,
  type SerializedCardResult,
} from '@/features/studio/tools/letreiros/cartao-visita/workerGeometry'
import type {
  CardWorker,
  CardWorkerRequest,
} from '@/features/studio/tools/letreiros/cartao-visita/workerClient'

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'
const EMPTY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>'

function serialized(): SerializedCardResult {
  return serializeCardResult({
    base: new THREE.BoxGeometry(85, 55, 2),
    content: new THREE.BoxGeometry(10, 4, 1),
    contentItems: [{ id: 'content-1', halfWidth: 5, halfHeight: 2, geometry: null }],
  }).data
}

interface WorkerRecord {
  pending: ((data: SerializedCardResult) => void) | null
  fail: ((message: string) => void) | null
  terminate: ReturnType<typeof vi.fn>
}

function makeWorkerFixture() {
  const workers: WorkerRecord[] = []
  let lastRequest: CardWorkerRequest | null = null
  const factory = (): CardWorker => {
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
    respond: (data: SerializedCardResult = serialized(), index = workers.length - 1) =>
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

describe('useCard', () => {
  it('inicia com 3 conteúdos de texto', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    expect(result.current.params.contents).toHaveLength(3)
    expect(result.current.params.contents[0].kind).toBe('text')
    if (result.current.params.contents[0].kind === 'text') {
      expect(result.current.params.contents[0].content).toBe('Seu Nome')
    }
  })

  it('updateParam clampa valores da peça', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => result.current.updateParam('width', 40))
    expect(result.current.params.width).toBe(50)
    act(() => result.current.updateParam('cornerRadius', 20))
    expect(result.current.params.cornerRadius).toBe(10)
  })

  it('reset restaura defaults', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => result.current.updateParam('width', 70))
    act(() => result.current.reset())
    expect(result.current.params).toEqual(defaultCardParams)
  })

  it('addContent respeita o limite de 3 e retorna o id', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    expect(result.current.addContent()).toBeNull()

    const removedId = result.current.params.contents[1].id
    act(() => result.current.removeContent(removedId))
    let addedId: string | null = null
    act(() => {
      addedId = result.current.addContent()
    })
    expect(addedId).not.toBeNull()
    expect(result.current.params.contents).toHaveLength(3)
  })

  it('removeContent não remove o último item', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => result.current.removeContent(result.current.params.contents[0].id))
    act(() => result.current.removeContent(result.current.params.contents[0].id))
    expect(result.current.params.contents).toHaveLength(1)
    act(() => result.current.removeContent(result.current.params.contents[0].id))
    expect(result.current.params.contents).toHaveLength(1)
  })

  it('updateContent patcha e clampa valores', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, {
      content: 'Maria',
      fontSize: 99,
      offsetX: -99,
    }))
    const updated = result.current.params.contents[0]
    expect(updated.kind).toBe('text')
    if (updated.kind === 'text') {
      expect(updated.content).toBe('Maria')
      expect(updated.fontSize).toBe(12)
    }
    expect(updated.offsetX).toBe(-40)
  })

  it('setContentType alterna texto/ícone preservando id e offsets', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { offsetX: 7, offsetY: -3 }))
    act(() => result.current.setContentType(id, 'icon'))
    const icon = result.current.params.contents[0]
    expect(icon.kind).toBe('icon')
    expect(icon.offsetX).toBe(7)
    expect(icon.offsetY).toBe(-3)
    if (icon.kind === 'icon') {
      expect(icon.svgIcon).toBeNull()
      expect(icon.iconScale).toBe(1)
    }
    act(() => result.current.setContentType(id, 'text'))
    const text = result.current.params.contents[0]
    expect(text.kind).toBe('text')
    if (text.kind === 'text') expect(text.content).toBe('Novo texto')
  })

  it('começa sem geometria, sem build e sem erro', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('inicia o worker após 200ms e envia os estilos', () => {
    const { factory, getRequest } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.isBuilding).toBe(true)
    expect(getRequest()?.styles).toEqual(['bold', 'normal'])
  })

  it('expõe erro quando o worker não inicia', () => {
    const factory = (): CardWorker => {
      throw new Error('boom')
    }
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBe('Não foi possível iniciar a geração')
  })

  it('define a geometria quando o worker responde', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.isBuilding).toBe(false)
  })

  it('não reconstrói ao trocar as cores', () => {
    const { factory, workers, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    expect(workers).toHaveLength(1)

    act(() => result.current.updateParam('baseColor', '#ef4444'))
    act(() => result.current.updateParam('letterColor', '#171717'))
    act(() => {
      vi.advanceTimersByTime(250)
    })

    expect(workers).toHaveLength(1)
    expect(result.current.params.baseColor).toBe('#ef4444')
    expect(result.current.params.letterColor).toBe('#171717')
  })

  it('expõe erro quando o worker falha', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      fail('Falha ao gerar a peça')
    })
    expect(result.current.error).toBe('Falha ao gerar a peça')
    expect(result.current.isBuilding).toBe(false)
  })

  it('parseia SVG válido e rejeita SVG vazio', () => {
    const { factory, getRequest } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.setContentType(id, 'icon'))
    act(() => result.current.updateContent(id, { svgIcon: SVG }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(getRequest()?.parsedSvgs[id]).not.toBeNull()

    act(() => result.current.updateContent(id, { svgIcon: EMPTY_SVG }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.error).toBe('Não foi possível ler o SVG')
  })

  it('ignora resposta de worker obsoleto', () => {
    const { factory, workers } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => result.current.updateParam('width', 60))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(workers).toHaveLength(2)

    act(() => {
      workers[0].pending?.(serialized())
    })
    expect(result.current.geometry).toBeNull()

    act(() => {
      workers[1].pending?.(serialized())
    })
    expect(result.current.geometry).not.toBeNull()
  })

  it('dimensions reflete os parâmetros', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    expect(result.current.dimensions).toEqual({
      width: 85,
      height: 55,
      thickness: 2,
    })
  })
})
