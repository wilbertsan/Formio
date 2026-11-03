import * as THREE from 'three'
import { act, renderHook } from '@testing-library/react'
import { useBookmark } from '@/features/studio/tools/letreiros/marcador-pagina/useBookmark'
import { defaultBookmarkParams } from '@/features/studio/tools/letreiros/marcador-pagina/schema'
import {
  serializeBookmarkResult,
  type SerializedBookmarkResult,
} from '@/features/studio/tools/letreiros/marcador-pagina/workerGeometry'
import type {
  BookmarkWorker,
  BookmarkWorkerRequest,
} from '@/features/studio/tools/letreiros/marcador-pagina/workerClient'

function serialized(): SerializedBookmarkResult {
  return serializeBookmarkResult({
    base: new THREE.BoxGeometry(120, 40, 2),
    text: new THREE.BoxGeometry(1, 40, 8),
  }).data
}

interface WorkerRecord {
  pending: ((data: SerializedBookmarkResult) => void) | null
  fail: ((message: string) => void) | null
  terminate: ReturnType<typeof vi.fn>
}

function makeWorkerFixture() {
  const workers: WorkerRecord[] = []
  let lastRequest: BookmarkWorkerRequest | null = null
  const factory = (): BookmarkWorker => {
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
  const current = () => workers[workers.length - 1]
  return {
    factory,
    workers,
    current,
    respond: (data: SerializedBookmarkResult = serialized(), index = workers.length - 1) =>
      workers[index]?.pending?.(data),
    fail: (message = 'Falha ao gerar a peça', index = workers.length - 1) =>
      workers[index]?.fail?.(message),
    getRequest: () => lastRequest,
  }
}

async function advance(ms = 200) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useBookmark', () => {
  it('inicia com o texto padrão', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useBookmark({ workerFactory: factory }))
    expect(result.current.params.text.content).toBe('Meu nome')
  })

  it('updateParam clampa valores da peça', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useBookmark({ workerFactory: factory }))
    act(() => result.current.updateParam('length', 40))
    expect(result.current.params.length).toBe(50)
    act(() => result.current.updateParam('thickness', 0.5))
    expect(result.current.params.thickness).toBe(1)
    act(() => result.current.updateParam('thickness', 3))
    expect(result.current.params.thickness).toBe(2)
  })

  it('updateText patcha o texto único', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useBookmark({ workerFactory: factory }))
    act(() => result.current.updateText({ content: 'Novo nome', width: 30 }))
    expect(result.current.params.text.content).toBe('Novo nome')
    expect(result.current.params.text.width).toBe(30)
  })

  it('aceita conteúdo longo sem limite de caracteres', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useBookmark({ workerFactory: factory }))
    const content = 'a'.repeat(200)
    act(() => result.current.updateText({ content }))
    expect(result.current.params.text.content).toBe(content)
  })

  it('updatePattern altera tipo, densidade e profundidade', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useBookmark({ workerFactory: factory }))
    act(() => result.current.updatePattern({ type: 'triangles', density: 'high', depth: 1.2 }))
    expect(result.current.params.pattern.type).toBe('triangles')
    expect(result.current.params.pattern.density).toBe('high')
    expect(result.current.params.pattern.depth).toBe(1.2)
  })

  it('reset restaura defaults', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useBookmark({ workerFactory: factory }))
    act(() => result.current.updateParam('length', 150))
    act(() => result.current.updateText({ content: 'Outro' }))
    act(() => result.current.reset())
    expect(result.current.params.length).toBe(defaultBookmarkParams.length)
    expect(result.current.params.text.content).toBe(defaultBookmarkParams.text.content)
  })

  it('gera a geometria via worker após o debounce', async () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => useBookmark({ workerFactory: fixture.factory }))

    await advance()
    expect(fixture.workers).toHaveLength(1)
    expect(result.current.isBuilding).toBe(true)
    expect(fixture.getRequest()?.styles).toEqual(['bold'])
    expect(fixture.getRequest()?.parsedSvg).toBeNull()

    act(() => fixture.respond())
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry?.base).toBeDefined()
    expect(result.current.geometry?.text).toBeDefined()
    expect(fixture.current().terminate).toHaveBeenCalled()
  })

  it('envia parsedSvg ao worker quando há SVG válido', async () => {
    const fixture = makeWorkerFixture()
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
    const { result } = renderHook(() => useBookmark({ workerFactory: fixture.factory }))
    act(() => result.current.updatePattern({ type: 'svg', svg }))
    await advance()
    expect(fixture.getRequest()?.parsedSvg).not.toBeNull()
  })

  it('expõe erro quando o SVG é inválido', async () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => useBookmark({ workerFactory: fixture.factory }))
    act(() => result.current.updatePattern({ type: 'svg', svg: 'não é um svg' }))
    await advance()
    expect(result.current.error).toBe('Não foi possível ler o SVG')
    expect(result.current.isBuilding).toBe(false)
  })

  it('expõe erro do worker e mantém a geometria anterior', async () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => useBookmark({ workerFactory: fixture.factory }))

    await advance()
    act(() => fixture.respond())
    const previous = result.current.geometry
    expect(previous).not.toBeNull()

    act(() => result.current.updateParam('length', 130))
    await advance()
    act(() => fixture.fail('Falha ao gerar a peça'))

    expect(result.current.error).toBe('Falha ao gerar a peça')
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).toBe(previous)
  })

  it('ignora resposta de worker obsoleto', async () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => useBookmark({ workerFactory: fixture.factory }))

    await advance()
    act(() => result.current.updateParam('length', 130))
    await advance()
    expect(fixture.workers).toHaveLength(2)

    act(() => fixture.respond(serialized(), 0))
    expect(result.current.geometry).toBeNull()

    act(() => fixture.respond(serialized(), 1))
    expect(result.current.geometry).not.toBeNull()
  })

  it('encerra o worker no unmount', async () => {
    const fixture = makeWorkerFixture()
    const { unmount } = renderHook(() => useBookmark({ workerFactory: fixture.factory }))
    await advance()
    const worker = fixture.current()
    unmount()
    expect(worker.terminate).toHaveBeenCalled()
  })

  it('expõe erro quando não é possível iniciar o worker', async () => {
    const factory = () => {
      throw new Error('sem worker')
    }
    const { result } = renderHook(() => useBookmark({ workerFactory: factory }))
    await advance()
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBe('Não foi possível iniciar a geração')
  })

  it('dimensions inclui length, width e thickness', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useBookmark({ workerFactory: factory }))
    expect(result.current.dimensions.length).toBe(defaultBookmarkParams.length)
    expect(result.current.dimensions.width).toBe(defaultBookmarkParams.width)
    expect(result.current.dimensions.thickness).toBe(defaultBookmarkParams.thickness)
  })
})
