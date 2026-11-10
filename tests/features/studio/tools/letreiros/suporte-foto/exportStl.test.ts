import * as THREE from 'three'
import type { MockInstance } from 'vitest'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { exportStl } from '@/features/studio/tools/letreiros/suporte-foto/exportStl'
import type { BuildPhotoStandResult } from '@/features/studio/tools/letreiros/suporte-foto/buildPhotoStand'

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: vi.fn((geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    return geos[0].clone()
  }),
}))

const mergeMock = vi.mocked(mergeGeometries)

function makeGeometry(content: THREE.BufferGeometry | null): BuildPhotoStandResult {
  return {
    base: new THREE.BoxGeometry(120, 25, 40),
    content,
    contentItems: [],
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

let urlDescriptors: {
  createObjectURL?: PropertyDescriptor
  revokeObjectURL?: PropertyDescriptor
} = {}
let createElementSpy: MockInstance | null = null
let bodyDescriptors: {
  appendChild?: PropertyDescriptor
  removeChild?: PropertyDescriptor
} = {}

function setupDownloadHarness() {
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
  if (descriptor) Object.defineProperty(target, name, descriptor)
  else delete (target as Record<string, unknown>)[name]
}

describe('exportStl', () => {
  beforeEach(() => {
    mergeMock.mockClear()
  })

  afterEach(() => {
    createElementSpy?.mockRestore()
    createElementSpy = null
    restoreProperty(document.body, 'appendChild', bodyDescriptors.appendChild)
    restoreProperty(document.body, 'removeChild', bodyDescriptors.removeChild)
    bodyDescriptors = {}
    restoreProperty(window.URL, 'createObjectURL', urlDescriptors.createObjectURL)
    restoreProperty(window.URL, 'revokeObjectURL', urlDescriptors.revokeObjectURL)
    urlDescriptors = {}
  })

  it('baixa um STL binário com nome sanitizado', () => {
    const harness = setupDownloadHarness()
    exportStl(makeGeometry(new THREE.BoxGeometry(40, 8, 1)), 'Suporte Família! @#')
    expect(harness.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.anchorStub.download).toBe('Suporte-Familia.stl')
    expect(harness.clickSpy).toHaveBeenCalledTimes(1)
    expect(harness.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('combina base e conteúdo na ordem correta', () => {
    setupDownloadHarness()
    const content = new THREE.BoxGeometry(40, 8, 1)
    const geometry = makeGeometry(content)
    exportStl(geometry, 'Com conteúdo')
    const merged = lastMergeArguments()
    expect(merged).toHaveLength(2)
    expect(Array.from(
      (merged[0].getAttribute('position') as THREE.BufferAttribute).array,
    )).toEqual(expectedPosition(geometry.base))
    expect(Array.from(
      (merged[1].getAttribute('position') as THREE.BufferAttribute).array,
    )).toEqual(expectedPosition(content))
  })

  it('combina apenas a base quando não há conteúdo', () => {
    setupDownloadHarness()
    exportStl(makeGeometry(null), 'Sem conteúdo')
    expect(lastMergeArguments()).toHaveLength(1)
  })

  it('informa erro e não baixa quando a mesclagem falha', () => {
    const harness = setupDownloadHarness()
    mergeMock.mockReturnValueOnce(null as unknown as THREE.BufferGeometry)
    const onError = vi.fn()

    exportStl(makeGeometry(new THREE.BoxGeometry(40, 8, 1)), 'Falha', onError)

    expect(onError).toHaveBeenCalledWith('Falha ao mesclar geometrias para exportação')
    expect(harness.createObjectURL).not.toHaveBeenCalled()
  })
})
