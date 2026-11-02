import * as THREE from 'three'
import { act, renderHook } from '@testing-library/react'
import { useKeychain } from '@/features/studio/tools/chaveiros/chaveiro/useKeychain'
import { defaultKeychainParams } from '@/features/studio/tools/chaveiros/chaveiro/schema'
import { serializeKeychainResult, type SerializedKeychainResult } from '@/features/studio/tools/chaveiros/chaveiro/workerGeometry'
import type { KeychainWorker, KeychainWorkerRequest } from '@/features/studio/tools/chaveiros/chaveiro/workerClient'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'

function serialized(): SerializedKeychainResult {
  return serializeKeychainResult({
    base: new THREE.BoxGeometry(10, 10, 3),
    content: new THREE.BoxGeometry(5, 5, 1),
    contentItems: [{ id: 'content-1', halfWidth: 5, halfHeight: 2, geometry: null }],
    pieceBB: { minX: -30, maxX: 30, minY: -15, maxY: 15 },
    hole: { x: 0, y: 10, radius: 4.5 },
  }).data
}

interface WorkerRecord {
  pending: ((data: SerializedKeychainResult) => void) | null
  fail: ((message: string) => void) | null
  terminate: ReturnType<typeof vi.fn>
}

// Worker falso controlável: guarda os callbacks de cada worker e só responde
// quando o teste mandar (inclusive permitindo responder um worker obsoleto).
function makeWorkerFixture() {
  const workers: WorkerRecord[] = []
  let lastRequest: KeychainWorkerRequest | null = null
  const factory = (): KeychainWorker => {
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
    respond: (index = workers.length - 1) => workers[index]?.pending?.(serialized()),
    fail: (message = 'Falha ao gerar a peça', index = workers.length - 1) => workers[index]?.fail?.(message),
    getRequest: () => lastRequest,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useKeychain', () => {
  it('inicia com 1 conteúdo de texto no default', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    expect(result.current.params.contents).toHaveLength(1)
    const [first] = result.current.params.contents
    expect(first.kind).toBe('text')
    if (first.kind === 'text') expect(first.content).toBe('Meu nome')
  })

  it('updateParam clampa valores da peça', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => result.current.updateParam('borderWidth', 2))
    expect(result.current.params.borderWidth).toBe(4)
  })

  it('reset restaura defaults e contents com 1 item', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => result.current.updateParam('width', 80))
    act(() => result.current.addContent())
    act(() => result.current.reset())
    expect(result.current.params.width).toBe(defaultKeychainParams.width)
    expect(result.current.params.contents).toHaveLength(1)
  })

  it('addContent adiciona um segundo texto e limita em 3', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => result.current.addContent())
    expect(result.current.params.contents).toHaveLength(2)
    const second = result.current.params.contents[1]
    expect(second.kind).toBe('text')
    if (second.kind === 'text') expect(second.content).toBe('Novo texto')

    act(() => result.current.addContent())
    act(() => result.current.addContent())
    expect(result.current.params.contents).toHaveLength(3)
  })

  it('addContent posiciona o novo conteúdo fora do centro', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => result.current.addContent())

    const added = result.current.params.contents[1]
    expect(added.offsetY).not.toBe(0)
    expect(added.offsetX).toBe(0)
  })

  it('addContent retorna o id do novo conteúdo e null ao atingir o limite', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    let firstId: string | null = null
    act(() => {
      firstId = result.current.addContent()
    })
    expect(firstId).toBe(result.current.params.contents[1].id)

    act(() => result.current.addContent())
    let overflowId: string | null = 'pendente'
    act(() => {
      overflowId = result.current.addContent()
    })
    expect(overflowId).toBeNull()
  })

  it('removeContent remove um item adicionado e não remove o último', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => result.current.addContent())
    const addedId = result.current.params.contents[1].id
    act(() => result.current.removeContent(addedId))
    expect(result.current.params.contents).toHaveLength(1)

    const lastId = result.current.params.contents[0].id
    act(() => result.current.removeContent(lastId))
    expect(result.current.params.contents).toHaveLength(1)
  })

  it('updateContent patcha o item correto', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { content: 'Novo nome', fontSize: 12, offsetX: 10 }))
    const updated = result.current.params.contents[0]
    expect(updated.kind).toBe('text')
    if (updated.kind === 'text') {
      expect(updated.content).toBe('Novo nome')
      expect(updated.fontSize).toBe(12)
    }
    expect(updated.offsetX).toBe(10)
  })

  it('updateContent clampa valores numéricos', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { fontSize: 99, offsetX: -99 }))
    const updated = result.current.params.contents[0]
    expect(updated.kind).toBe('text')
    if (updated.kind === 'text') expect(updated.fontSize).toBe(15)
    expect(updated.offsetX).toBe(-20)
  })

  it('updateContent ignora id desconhecido', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    const before = result.current.params.contents
    act(() => result.current.updateContent('missing-id', { content: 'Fantasma' }))
    expect(result.current.params.contents).toEqual(before)
    const [first] = result.current.params.contents
    if (first.kind === 'text') expect(first.content).toBe('Meu nome')
  })

  it('setContentType alterna texto para ícone preservando id e offsets, e volta', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { offsetX: 7, offsetY: -3 }))
    act(() => result.current.setContentType(id, 'icon'))

    const icon = result.current.params.contents[0]
    expect(icon.id).toBe(id)
    expect(icon.kind).toBe('icon')
    expect(icon.offsetX).toBe(7)
    expect(icon.offsetY).toBe(-3)
    if (icon.kind === 'icon') {
      expect(icon.svgIcon).toBeNull()
      expect(icon.iconScale).toBe(1)
    }

    act(() => result.current.setContentType(id, 'text'))
    const text = result.current.params.contents[0]
    expect(text.id).toBe(id)
    expect(text.kind).toBe('text')
    if (text.kind === 'text') expect(text.content).toBe('Novo texto')
  })

  it('setContentType para o mesmo tipo é idempotente e preserva dados', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { content: 'Custom' }))
    act(() => result.current.setContentType(id, 'text'))
    const text = result.current.params.contents[0]
    expect(text.kind).toBe('text')
    if (text.kind === 'text') expect(text.content).toBe('Custom')
  })

  it('setContentType para o mesmo tipo de ícone preserva o svg', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.setContentType(id, 'icon'))
    act(() => result.current.updateContent(id, { svgIcon: '<svg></svg>' }))
    act(() => result.current.setContentType(id, 'icon'))
    const icon = result.current.params.contents[0]
    expect(icon.kind).toBe('icon')
    if (icon.kind === 'icon') expect(icon.svgIcon).toBe('<svg></svg>')
  })

  it('updateContent aceita svgIcon em item de ícone', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.setContentType(id, 'icon'))
    act(() => result.current.updateContent(id, { svgIcon: '<svg></svg>' }))
    const icon = result.current.params.contents[0]
    expect(icon.kind).toBe('icon')
    if (icon.kind === 'icon') expect(icon.svgIcon).toBe('<svg></svg>')
  })

  it('começa sem geometria, sem build em andamento e sem erro', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('inicia o worker após o debounce de 200ms', () => {
    const { factory, getRequest } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.isBuilding).toBe(true)
    expect(getRequest()).not.toBeNull()
  })

  it('define a geometria quando o worker responde', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry?.base).toBeDefined()
    expect(result.current.geometry?.content).toBeDefined()
  })

  it('expõe erro e encerra o build quando o worker falha', () => {
    const { factory, fail, workers } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.isBuilding).toBe(true)
    act(() => {
      fail('Falha ao gerar a peça')
    })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBe('Falha ao gerar a peça')
    expect(workers[0].terminate).toHaveBeenCalledTimes(1)
  })

  it('limpa o erro no próximo resultado bem-sucedido', () => {
    const { factory, fail, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      fail()
    })
    expect(result.current.error).toBe('Falha ao gerar a peça')

    act(() => result.current.updateParam('width', 60))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.geometry).not.toBeNull()
  })

  it('parseia o SVG na main thread e envia ao worker', () => {
    const { factory, getRequest } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.setContentType(id, 'icon'))
    act(() => result.current.updateContent(id, { svgIcon: SVG }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    const request = getRequest()
    expect(request).not.toBeNull()
    const parsed = request!.parsedSvgs[id]
    expect(parsed).not.toBeNull()
    expect(parsed!.fills.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('expõe erro e não chama o worker quando o SVG é inválido', () => {
    const { factory, getRequest } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.setContentType(id, 'icon'))
    act(() => result.current.updateContent(id, { svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>' }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.error).toBe('Não foi possível ler o SVG')
    expect(getRequest()).toBeNull()
  })

  it('mantém a geometria anterior enquanto um novo build está em andamento', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    expect(result.current.geometry).not.toBeNull()

    act(() => result.current.updateParam('width', 60))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.isBuilding).toBe(true)
  })

  it('encerra o worker ao reconstruir e ao desmontar', () => {
    const { factory, workers } = makeWorkerFixture()
    const { result, unmount } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(workers).toHaveLength(1)
    expect(workers[0].terminate).not.toHaveBeenCalled()

    act(() => result.current.updateParam('width', 60))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(workers).toHaveLength(2)
    expect(workers[0].terminate).toHaveBeenCalledTimes(1)

    unmount()
    expect(workers[1].terminate).toHaveBeenCalledTimes(1)
  })

  it('ignora o resultado de um worker obsoleto', () => {
    const { factory, workers } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
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

  it('descarta a geometria anterior ao trocar pela nova', () => {
    const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose')
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    expect(result.current.geometry).not.toBeNull()

    disposeSpy.mockClear()
    act(() => result.current.updateParam('width', 60))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    expect(disposeSpy).toHaveBeenCalled()
    disposeSpy.mockRestore()
  })

  it('dimensions inclui width, height e thickness para retângulo após a resposta', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    expect(result.current.dimensions.width).toBe(50)
    expect(result.current.dimensions.height).toBe(25)
    expect(result.current.dimensions.thickness).toBe(defaultKeychainParams.thickness)
  })

  it('dimensions para name usa pieceBB quando a geometria existe', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => result.current.updateParam('baseShape', 'name'))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    expect(result.current.dimensions.width).toBe(60)
    expect(result.current.dimensions.height).toBe(30)
  })

  it('height é independente do width e é clampado', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useKeychain({ workerFactory: factory }))
    act(() => result.current.updateParam('height', 40))
    expect(result.current.params.height).toBe(40)
    expect(result.current.dimensions.height).toBe(40)

    act(() => result.current.updateParam('height', 10))
    expect(result.current.params.height).toBe(20)
  })
})
