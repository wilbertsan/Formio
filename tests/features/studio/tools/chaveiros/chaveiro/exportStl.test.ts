import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { exportStl } from '@/features/studio/tools/chaveiros/chaveiro/exportStl'
import type { BuildKeychainResult } from '@/features/studio/tools/chaveiros/chaveiro/buildKeychain'

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: vi.fn((geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    return geos[0].clone()
  }),
}))

const PIECE_BB = { minX: -5, maxX: 5, minY: -5, maxY: 5 }
const HOLE = { x: 0, y: 0, radius: 0 }

function makeGeometry(
  content: THREE.BufferGeometry | null,
  base: THREE.BufferGeometry = new THREE.BoxGeometry(10, 10, 10),
): BuildKeychainResult {
  return {
    base,
    content,
    contentItems: [],
    pieceBB: PIECE_BB,
    hole: HOLE,
  }
}

function expectedPosition(geometry: THREE.BufferGeometry): number[] {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  const positions = Array.from(
    (source.getAttribute('position') as THREE.BufferAttribute).array,
  )
  if (source !== geometry) source.dispose()
  return positions
}

function lastMergeArguments(): THREE.BufferGeometry[] {
  const calls = vi.mocked(mergeGeometries).mock.calls
  const lastCall = calls[calls.length - 1]
  if (!lastCall) throw new Error('mergeGeometries não foi chamado')
  return lastCall[0]
}

let restoreEnvironment: (() => void) | null = null

function stubDownloadEnvironment() {
  const createObjectURLDescriptor = Object.getOwnPropertyDescriptor(window.URL, 'createObjectURL')
  const revokeObjectURLDescriptor = Object.getOwnPropertyDescriptor(window.URL, 'revokeObjectURL')
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: createObjectURL,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: revokeObjectURL,
    writable: true,
    configurable: true,
  })

  const clickSpy = vi.fn()
  const anchorStub = { click: clickSpy, href: '', download: '' }
  const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorStub as never)
  const appendChildSpy = vi.fn()
  const removeChildSpy = vi.fn()
  const appendChildOrig = document.body.appendChild.bind(document.body)
  const removeChildOrig = document.body.removeChild.bind(document.body)
  Object.defineProperty(document.body, 'appendChild', {
    value: appendChildSpy,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(document.body, 'removeChild', {
    value: removeChildSpy,
    writable: true,
    configurable: true,
  })

  const restore = () => {
    createElementSpy.mockRestore()
    Object.defineProperty(document.body, 'appendChild', {
      value: appendChildOrig,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(document.body, 'removeChild', {
      value: removeChildOrig,
      writable: true,
      configurable: true,
    })
    if (createObjectURLDescriptor) {
      Object.defineProperty(window.URL, 'createObjectURL', createObjectURLDescriptor)
    }
    if (revokeObjectURLDescriptor) {
      Object.defineProperty(window.URL, 'revokeObjectURL', revokeObjectURLDescriptor)
    }
  }

  restoreEnvironment = restore
  return { createObjectURL, revokeObjectURL, clickSpy, anchorStub }
}

describe('exportStl', () => {
  beforeEach(() => {
    vi.mocked(mergeGeometries).mockClear()
  })

  afterEach(() => {
    restoreEnvironment?.()
    restoreEnvironment = null
    vi.mocked(mergeGeometries).mockClear()
  })

  it('gera download com blob e nome sanitizado', () => {
    const env = stubDownloadEnvironment()

    exportStl(makeGeometry(new THREE.BoxGeometry(5, 5, 5)), 'Meu Projeto! @#')

    expect(env.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (env.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(env.anchorStub.download).toBe('Meu-Projeto.stl')
    expect(env.clickSpy).toHaveBeenCalledTimes(1)
    expect(env.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('combina base e conteúdo normalizados na ordem correta', () => {
    stubDownloadEnvironment()
    const content = new THREE.BoxGeometry(5, 5, 5)
    const geometry = makeGeometry(content)

    exportStl(geometry, 'Com conteúdo')

    const mergedGeometries = lastMergeArguments()
    expect(mergedGeometries).toHaveLength(2)
    expect(Array.from(
      (mergedGeometries[0].getAttribute('position') as THREE.BufferAttribute).array,
    )).toEqual(expectedPosition(geometry.base))
    expect(Array.from(
      (mergedGeometries[1].getAttribute('position') as THREE.BufferAttribute).array,
    )).toEqual(expectedPosition(content))
  })

  it('combina apenas a base quando não há conteúdo', () => {
    stubDownloadEnvironment()
    const geometry = makeGeometry(null)

    exportStl(geometry, 'Sem conteúdo')

    const mergedGeometries = lastMergeArguments()
    expect(mergedGeometries).toHaveLength(1)
    expect(Array.from(
      (mergedGeometries[0].getAttribute('position') as THREE.BufferAttribute).array,
    )).toEqual(expectedPosition(geometry.base))
  })

  it('normaliza base indexada e conteúdo não indexado antes de combinar', () => {
    stubDownloadEnvironment()
    const base = new THREE.BoxGeometry(10, 10, 10)
    const content = new THREE.TetrahedronGeometry(2)
    expect(base.index).not.toBeNull()
    expect(content.index).toBeNull()
    const geometry = makeGeometry(content, base)

    exportStl(geometry, 'Misto')

    const mergedGeometries = lastMergeArguments()
    expect(mergedGeometries).toHaveLength(2)
    expect(mergedGeometries[0].index).toBeNull()
    expect(mergedGeometries[1].index).toBeNull()
    expect(mergedGeometries[0].getAttribute('normal')).toBeDefined()
    expect(mergedGeometries[1].getAttribute('normal')).toBeDefined()
    expect(Array.from(
      (mergedGeometries[0].getAttribute('position') as THREE.BufferAttribute).array,
    )).toEqual(expectedPosition(base))
    expect(Array.from(
      (mergedGeometries[1].getAttribute('position') as THREE.BufferAttribute).array,
    )).toEqual(expectedPosition(content))
  })
})
