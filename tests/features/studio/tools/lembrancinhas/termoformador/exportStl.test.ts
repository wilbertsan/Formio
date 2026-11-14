import { describe, it, expect, vi, afterEach } from 'vitest'
import { BoxGeometry, BufferGeometry } from 'three'
import {
  exportThermoformerStl,
  prepareScreenForPrint,
} from '@/features/studio/tools/lembrancinhas/termoformador/exportStl'

const { parseMock } = vi.hoisted(() => ({
  parseMock: vi.fn(() => new DataView(new ArrayBuffer(84))),
}))

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class {
    parse = parseMock
  },
}))

const originalCreateObjectURL = Object.getOwnPropertyDescriptor(window.URL, 'createObjectURL')
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(window.URL, 'revokeObjectURL')

type Anchor = {
  click: ReturnType<typeof vi.fn>
  href: string
  download: string
}

let restoreElementSpies: (() => void) | null = null

function setupDownloadMocks() {
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

  const anchors: Anchor[] = []
  const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(() => {
    const anchor = { click: vi.fn(), href: '', download: '' }
    anchors.push(anchor)
    return anchor as never
  })
  const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as never)
  const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as never)
  restoreElementSpies = () => {
    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  }
  return { anchors, appendChildSpy, removeChildSpy, createObjectURL, revokeObjectURL }
}

function restoreUrlDescriptors(): void {
  if (originalCreateObjectURL) {
    Object.defineProperty(window.URL, 'createObjectURL', originalCreateObjectURL)
  } else {
    Reflect.deleteProperty(window.URL, 'createObjectURL')
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(window.URL, 'revokeObjectURL', originalRevokeObjectURL)
  } else {
    Reflect.deleteProperty(window.URL, 'revokeObjectURL')
  }
}

function positions(geometry: BufferGeometry): Float32Array {
  return Float32Array.from(geometry.getAttribute('position').array)
}

afterEach(() => {
  restoreElementSpies?.()
  restoreElementSpies = null
  restoreUrlDescriptors()
})

describe('exportThermoformerStl', () => {
  it('baixa um único STL com o nome do projeto', () => {
    const { anchors, appendChildSpy, removeChildSpy, revokeObjectURL } = setupDownloadMocks()
    const geometry = new BoxGeometry(160, 3, 160)
    const cloneSpy = vi.spyOn(BufferGeometry.prototype, 'clone')
    const disposeSpy = vi.spyOn(BufferGeometry.prototype, 'dispose')

    exportThermoformerStl(geometry, 'Minha Tela!')

    expect(anchors).toHaveLength(1)
    expect(anchors[0].download).toBe('Minha-Tela-tela.stl')
    expect(anchors[0].href).toBe('blob:mock-url')
    expect(anchors[0].click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(appendChildSpy).toHaveBeenCalledWith(anchors[0])
    expect(removeChildSpy).toHaveBeenCalledWith(anchors[0])
    expect(parseMock).toHaveBeenCalledWith(expect.anything(), { binary: true })

    const clone = cloneSpy.mock.results[0].value as BufferGeometry
    expect(disposeSpy).toHaveBeenCalledTimes(1)
    expect(disposeSpy.mock.instances[0]).toBe(clone)
    expect(disposeSpy.mock.instances[0]).not.toBe(geometry)

    cloneSpy.mockRestore()
    disposeSpy.mockRestore()
  })

  it('usa o nome padrão quando o projeto está vazio', () => {
    const { anchors } = setupDownloadMocks()
    exportThermoformerStl(new BoxGeometry(160, 3, 160), '')
    expect(anchors[0].download).toBe('termoformador-tela.stl')
  })
})

describe('prepareScreenForPrint', () => {
  it('centraliza na mesa sem mutar o original', () => {
    const geometry = new BoxGeometry(160, 3, 160)
    geometry.translate(20, 11, -35)
    const original = positions(geometry)

    const print = prepareScreenForPrint(geometry)
    print.computeBoundingBox()

    expect(print.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(print.boundingBox!.min.x).toBeCloseTo(-80, 3)
    expect(print.boundingBox!.max.x).toBeCloseTo(80, 3)
    expect(print.boundingBox!.min.z).toBeCloseTo(-80, 3)
    expect(Array.from(geometry.getAttribute('position').array)).toEqual(Array.from(original))

    geometry.dispose()
    print.dispose()
  })
})
