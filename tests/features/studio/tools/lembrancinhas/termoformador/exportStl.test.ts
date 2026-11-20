import { describe, it, expect, vi, afterEach } from 'vitest'
import { BoxGeometry, BufferGeometry } from 'three'
import { buildPlug, getPlugDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/buildPlug'
import type { BuildThermoformerResult } from '@/features/studio/tools/lembrancinhas/termoformador/buildThermoformer'
import {
  exportThermoformerStl,
  preparePlugForPrint,
  prepareScreenForPrint,
  prepareSupportForPrint,
} from '@/features/studio/tools/lembrancinhas/termoformador/exportStl'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

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

function buildResult(): BuildThermoformerResult {
  return {
    screen: new BoxGeometry(160, 3, 160),
    support: new BoxGeometry(168.6, 27, 168.6),
    plug: new BoxGeometry(160, 46, 160),
    seatY: 24,
  }
}

afterEach(() => {
  restoreElementSpies?.()
  restoreElementSpies = null
  restoreUrlDescriptors()
})

describe('exportThermoformerStl', () => {
  it('baixa tela, suporte e macho como STLs separados com o nome do projeto', () => {
    const { anchors, appendChildSpy, removeChildSpy, revokeObjectURL } = setupDownloadMocks()
    parseMock.mockClear()
    const result = buildResult()
    const cloneSpy = vi.spyOn(BufferGeometry.prototype, 'clone')
    const disposeSpy = vi.spyOn(BufferGeometry.prototype, 'dispose')

    exportThermoformerStl(result, 'Minha Tela!')

    expect(anchors).toHaveLength(3)
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'Minha-Tela-tela.stl',
      'Minha-Tela-suporte.stl',
      'Minha-Tela-macho.stl',
    ])
    for (const anchor of anchors) {
      expect(anchor.href).toBe('blob:mock-url')
      expect(anchor.click).toHaveBeenCalledTimes(1)
    }
    expect(revokeObjectURL).toHaveBeenCalledTimes(3)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(appendChildSpy).toHaveBeenCalledTimes(3)
    expect(removeChildSpy).toHaveBeenCalledTimes(3)
    expect(parseMock).toHaveBeenCalledTimes(3)
    expect(parseMock).toHaveBeenCalledWith(expect.anything(), { binary: true })

    const clones = cloneSpy.mock.results.map(({ value }) => value as BufferGeometry)
    expect(cloneSpy).toHaveBeenCalledTimes(3)
    expect(disposeSpy).toHaveBeenCalledTimes(3)
    expect(disposeSpy.mock.instances[0]).toBe(clones[0])
    expect(disposeSpy.mock.instances[1]).toBe(clones[1])
    expect(disposeSpy.mock.instances[2]).toBe(clones[2])
    expect(disposeSpy.mock.instances).not.toContain(result.screen)
    expect(disposeSpy.mock.instances).not.toContain(result.support)
    expect(disposeSpy.mock.instances).not.toContain(result.plug)

    cloneSpy.mockRestore()
    disposeSpy.mockRestore()
  })

  it('usa o nome padrão quando o projeto está vazio', () => {
    const { anchors } = setupDownloadMocks()
    exportThermoformerStl(buildResult(), '')
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'termoformador-tela.stl',
      'termoformador-suporte.stl',
      'termoformador-macho.stl',
    ])
  })
})

describe('prepareScreenForPrint', () => {
  it('clona e centraliza a tela na mesa sem mutar o original', () => {
    const geometry = new BoxGeometry(160, 3, 160)
    geometry.translate(20, 11, -35)
    const original = positions(geometry)
    const cloneSpy = vi.spyOn(BufferGeometry.prototype, 'clone')

    const print = prepareScreenForPrint(geometry)
    print.computeBoundingBox()

    expect(cloneSpy).toHaveBeenCalledTimes(1)
    expect(print).not.toBe(geometry)
    expect(print.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(print.boundingBox!.max.y).toBeCloseTo(3, 3)
    expect(print.boundingBox!.min.x).toBeCloseTo(-80, 3)
    expect(print.boundingBox!.max.x).toBeCloseTo(80, 3)
    expect(print.boundingBox!.min.z).toBeCloseTo(-80, 3)
    expect(print.boundingBox!.max.z).toBeCloseTo(80, 3)
    expect(Array.from(geometry.getAttribute('position').array)).toEqual(Array.from(original))

    cloneSpy.mockRestore()
    geometry.dispose()
    print.dispose()
  })
})

describe('prepareSupportForPrint', () => {
  it('clona e centraliza o suporte na mesa sem mutar o original', () => {
    const geometry = new BoxGeometry(168.6, 27, 168.6)
    geometry.translate(20, 11, -35)
    const original = positions(geometry)
    const cloneSpy = vi.spyOn(BufferGeometry.prototype, 'clone')

    const print = prepareSupportForPrint(geometry)
    print.computeBoundingBox()

    expect(cloneSpy).toHaveBeenCalledTimes(1)
    expect(print).not.toBe(geometry)
    expect(print.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(print.boundingBox!.max.y).toBeCloseTo(27, 3)
    expect(print.boundingBox!.min.x).toBeCloseTo(-84.3, 3)
    expect(print.boundingBox!.max.x).toBeCloseTo(84.3, 3)
    expect(print.boundingBox!.min.z).toBeCloseTo(-84.3, 3)
    expect(print.boundingBox!.max.z).toBeCloseTo(84.3, 3)
    expect(Array.from(geometry.getAttribute('position').array)).toEqual(Array.from(original))

    cloneSpy.mockRestore()
    geometry.dispose()
    print.dispose()
  })
})

describe('preparePlugForPrint', () => {
  it('gira o macho com o topo na mesa e centraliza', () => {
    const params = defaultThermoformerParams
    const plug = buildPlug(params)
    const dims = getPlugDimensions(params)
    const print = preparePlugForPrint(plug)
    print.computeBoundingBox()

    expect(print.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(print.boundingBox!.max.y).toBeCloseTo(dims.height, 3)

    const position = print.getAttribute('position')
    let atBed = 0
    for (let index = 0; index < position.count; index++) {
      if (Math.abs(position.getY(index)) < 1e-3) atBed++
    }
    expect(atBed).toBeGreaterThan(100)

    const original = plug.getAttribute('position')
    expect(original.getY(0)).toBeCloseTo(dims.domeCenterY, 3)

    print.dispose()
    plug.dispose()
  })
})
