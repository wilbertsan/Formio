import * as THREE from 'three'
import type { MockInstance } from 'vitest'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { exportCakeTopperStl } from '@/features/studio/tools/confeitaria/topo-bolo/exportStl'

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('three/examples/jsm/utils/BufferGeometryUtils.js')>()
  return { ...actual, mergeGeometries: vi.fn(actual.mergeGeometries) }
})

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class {
    parse() {
      return new ArrayBuffer(100)
    }
  },
}))

const mergeMock = vi.mocked(mergeGeometries)

interface DownloadHarness {
  createObjectURL: ReturnType<typeof vi.fn>
  revokeObjectURL: ReturnType<typeof vi.fn>
  clickSpy: ReturnType<typeof vi.fn>
  appendChildSpy: ReturnType<typeof vi.fn>
  removeChildSpy: ReturnType<typeof vi.fn>
  anchorStub: { click: () => void; href: string; download: string }
}

let urlDescriptors: {
  createObjectURL?: PropertyDescriptor
  revokeObjectURL?: PropertyDescriptor
} = {}
let createElementSpy: MockInstance | null = null
let bodyDescriptors: { appendChild?: PropertyDescriptor; removeChild?: PropertyDescriptor } = {}

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
  const appendChildSpy = vi.fn()
  const removeChildSpy = vi.fn()
  const anchorStub = { click: clickSpy, href: '', download: '' }
  createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorStub as never)
  bodyDescriptors = {
    appendChild: Object.getOwnPropertyDescriptor(document.body, 'appendChild'),
    removeChild: Object.getOwnPropertyDescriptor(document.body, 'removeChild'),
  }
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

  return {
    createObjectURL,
    revokeObjectURL,
    clickSpy,
    appendChildSpy,
    removeChildSpy,
    anchorStub,
  }
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

describe('exportCakeTopperStl', () => {
  it('une placa não indexada com suporte indexado usando o merge real', () => {
    const harness = setupDownloadHarness()

    const plate = new THREE.BoxGeometry(80, 50, 3).toNonIndexed()
    const support = new THREE.CylinderGeometry(2, 2, 40, 24)
    expect(plate.index).toBeNull()
    expect(support.index).not.toBeNull()

    exportCakeTopperStl({ plate, relief: null, support }, 'Com haste')

    const passedParts = mergeMock.mock.calls[0]?.[0] as THREE.BufferGeometry[]
    expect(passedParts).toHaveLength(2)
    expect(mergeMock.mock.results[0]?.value).not.toBeNull()

    const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.clickSpy).toHaveBeenCalledTimes(1)
    expect(harness.anchorStub.download).toBe('Com-haste.stl')
  })

  it('gera download com blob e nome sanitizado', () => {
    const harness = setupDownloadHarness()

    const plate = new THREE.BoxGeometry(80, 50, 3)
    const relief = new THREE.BoxGeometry(40, 10, 1)
    const support = new THREE.CylinderGeometry(2, 2, 40, 24)
    exportCakeTopperStl({ plate, relief, support }, 'Meu Topo! @#')

    const passedParts = mergeMock.mock.calls[0]?.[0] as THREE.BufferGeometry[]
    expect(passedParts).toHaveLength(3)
    expect(mergeMock.mock.results[0]?.value).not.toBeNull()

    expect(harness.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.anchorStub.download).toBe('Meu-Topo.stl')
    expect(harness.clickSpy).toHaveBeenCalledTimes(1)
    expect(harness.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(harness.appendChildSpy).toHaveBeenCalledTimes(1)
    expect(harness.removeChildSpy).toHaveBeenCalledTimes(1)
  })

  it('exporta apenas a placa quando relevo e suporte são nulos', () => {
    const harness = setupDownloadHarness()

    const plate = new THREE.BoxGeometry(80, 50, 3)
    exportCakeTopperStl({ plate, relief: null, support: null }, 'Sem relevo')

    const passedParts = mergeMock.mock.calls[0]?.[0] as THREE.BufferGeometry[]
    expect(passedParts).toHaveLength(1)

    expect(harness.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.clickSpy).toHaveBeenCalledTimes(1)
    expect(harness.anchorStub.download).toBe('Sem-relevo.stl')
    expect(harness.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(harness.appendChildSpy).toHaveBeenCalledTimes(1)
    expect(harness.removeChildSpy).toHaveBeenCalledTimes(1)
  })

  it('aciona onError e mantém a placa quando o merge falha', () => {
    const harness = setupDownloadHarness()
    mergeMock.mockReturnValueOnce(null as unknown as THREE.BufferGeometry)
    const onError = vi.fn()

    const plate = new THREE.BoxGeometry(80, 50, 3)
    const relief = new THREE.BoxGeometry(40, 10, 1)
    exportCakeTopperStl({ plate, relief, support: null }, 'Falha', onError)

    expect(onError).toHaveBeenCalledWith('Falha ao mesclar geometrias para exportação')
    expect(harness.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.anchorStub.download).toBe('Falha.stl')
    expect(harness.clickSpy).toHaveBeenCalledTimes(1)
    expect(harness.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(harness.appendChildSpy).toHaveBeenCalledTimes(1)
    expect(harness.removeChildSpy).toHaveBeenCalledTimes(1)
  })
})
