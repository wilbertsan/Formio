import * as THREE from 'three'
import type { MockInstance } from 'vitest'
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

const mergeMock = vi.mocked(mergeGeometries)

interface DownloadHarness {
  createObjectURL: ReturnType<typeof vi.fn>
  revokeObjectURL: ReturnType<typeof vi.fn>
  clickSpy: ReturnType<typeof vi.fn>
  anchorStub: { click: () => void; href: string; download: string }
}

let urlDescriptors: {
  createObjectURL?: PropertyDescriptor
  revokeObjectURL?: PropertyDescriptor
} = {}
let createElementSpy: MockInstance | null = null
let bodyDescriptors: { appendChild?: PropertyDescriptor; removeChild?: PropertyDescriptor } = {}

function makeGeometry(
  content: THREE.BufferGeometry | null,
  base: THREE.BufferGeometry = new THREE.BoxGeometry(10, 10, 10),
  mode: BuildKeychainResult['mode'] = 'raised',
): BuildKeychainResult {
  return {
    base,
    content,
    mode,
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
  const calls = mergeMock.mock.calls
  const lastCall = calls[calls.length - 1]
  if (!lastCall) throw new Error('mergeGeometries não foi chamado')
  return lastCall[0]
}

function setupDownloadHarness(): DownloadHarness {
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()
  urlDescriptors = {
    createObjectURL: Object.getOwnPropertyDescriptor(window.URL, 'createObjectURL'),
    revokeObjectURL: Object.getOwnPropertyDescriptor(window.URL, 'revokeObjectURL'),
  }
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
  createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorStub as never)
  bodyDescriptors = {
    appendChild: Object.getOwnPropertyDescriptor(document.body, 'appendChild'),
    removeChild: Object.getOwnPropertyDescriptor(document.body, 'removeChild'),
  }
  Object.defineProperty(document.body, 'appendChild', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })
  Object.defineProperty(document.body, 'removeChild', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })

  return { createObjectURL, revokeObjectURL, clickSpy, anchorStub }
}

function restoreProperty(
  target: object,
  name: string,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(target, name, descriptor)
  } else {
    delete (target as Record<string, unknown>)[name]
  }
}

describe('exportStl', () => {
  beforeEach(() => {
    mergeMock.mockClear()
  })

  afterEach(() => {
    mergeMock.mockClear()
    createElementSpy?.mockRestore()
    createElementSpy = null
    restoreProperty(document.body, 'appendChild', bodyDescriptors.appendChild)
    restoreProperty(document.body, 'removeChild', bodyDescriptors.removeChild)
    bodyDescriptors = {}
    restoreProperty(window.URL, 'createObjectURL', urlDescriptors.createObjectURL)
    restoreProperty(window.URL, 'revokeObjectURL', urlDescriptors.revokeObjectURL)
    urlDescriptors = {}
  })

  it('gera download com blob e nome sanitizado', () => {
    const harness = setupDownloadHarness()

    exportStl(makeGeometry(new THREE.BoxGeometry(5, 5, 5)), 'Meu Projeto! @#')

    expect(harness.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.anchorStub.download).toBe('Meu-Projeto.stl')
    expect(harness.clickSpy).toHaveBeenCalledTimes(1)
    expect(harness.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('combina base e conteúdo normalizados na ordem correta', () => {
    setupDownloadHarness()
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

  it('modo engraved exporta apenas a base mesmo com conteúdo presente', () => {
    setupDownloadHarness()
    const content = new THREE.BoxGeometry(5, 5, 5)
    const geometry = makeGeometry(content, new THREE.BoxGeometry(10, 10, 10), 'engraved')

    exportStl(geometry, 'Gravado')

    const mergedGeometries = lastMergeArguments()
    expect(mergedGeometries).toHaveLength(1)
    expect(Array.from(
      (mergedGeometries[0].getAttribute('position') as THREE.BufferAttribute).array,
    )).toEqual(expectedPosition(geometry.base))
  })

  it('combina apenas a base quando não há conteúdo', () => {
    setupDownloadHarness()
    const geometry = makeGeometry(null)

    exportStl(geometry, 'Sem conteúdo')

    const mergedGeometries = lastMergeArguments()
    expect(mergedGeometries).toHaveLength(1)
    expect(Array.from(
      (mergedGeometries[0].getAttribute('position') as THREE.BufferAttribute).array,
    )).toEqual(expectedPosition(geometry.base))
  })

  it('normaliza base indexada e conteúdo não indexado antes de combinar', () => {
    setupDownloadHarness()
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
