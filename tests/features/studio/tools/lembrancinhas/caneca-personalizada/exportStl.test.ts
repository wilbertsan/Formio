import { describe, it, expect, vi, afterEach } from 'vitest'
import { BoxGeometry, BufferGeometry } from 'three'
import {
  exportMugStl,
  prepareBodyForPrint,
  prepareHandleForPrint,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/exportStl'
import type { BuildMugResult } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug'
import { buildHandle } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'

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
  return { anchors, appendChildSpy, removeChildSpy, revokeObjectURL }
}

function positions(geometry: BufferGeometry): Float32Array {
  return Float32Array.from(geometry.getAttribute('position').array)
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

afterEach(() => {
  restoreElementSpies?.()
  restoreElementSpies = null
  restoreUrlDescriptors()
})

describe('exportMugStl', () => {
  it('baixa corpo e alça com o nome do projeto', () => {
    const { anchors, appendChildSpy, removeChildSpy, revokeObjectURL } = setupDownloadMocks()
    parseMock.mockClear()
    const result: BuildMugResult = {
      body: new BoxGeometry(80, 88, 80),
      handle: new BoxGeometry(52, 43, 12),
    }
    const bodyOriginal = positions(result.body)
    const handleOriginal = positions(result.handle!)
    const cloneSpy = vi.spyOn(BufferGeometry.prototype, 'clone')
    const disposeSpy = vi.spyOn(BufferGeometry.prototype, 'dispose')

    exportMugStl(result, 'Caneca da Ana!')

    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'Caneca-da-Ana-corpo.stl',
      'Caneca-da-Ana-alca.stl',
    ])
    for (const anchor of anchors) {
      expect(anchor.href).toBe('blob:mock-url')
      expect(anchor.click).toHaveBeenCalledTimes(1)
    }
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(appendChildSpy).toHaveBeenCalledTimes(2)
    expect(removeChildSpy).toHaveBeenCalledTimes(2)
    // O exportador roda uma vez por peça, sempre em STL binário.
    expect(parseMock).toHaveBeenCalledTimes(2)
    expect(parseMock).toHaveBeenCalledWith(expect.anything(), { binary: true })

    // Cada peça é exportada a partir de um clone descartável.
    const clones = cloneSpy.mock.results.map(({ value }) => value as BufferGeometry)
    expect(cloneSpy).toHaveBeenCalledTimes(2)
    expect(disposeSpy).toHaveBeenCalledTimes(2)
    expect(disposeSpy.mock.instances[0]).toBe(clones[0])
    expect(disposeSpy.mock.instances[1]).toBe(clones[1])
    expect(disposeSpy.mock.instances).not.toContain(result.body)
    expect(disposeSpy.mock.instances).not.toContain(result.handle)

    // As geometrias do resultado continuam intactas.
    expect(Array.from(result.body.getAttribute('position').array)).toEqual(Array.from(bodyOriginal))
    expect(Array.from(result.handle!.getAttribute('position').array)).toEqual(
      Array.from(handleOriginal),
    )

    cloneSpy.mockRestore()
    disposeSpy.mockRestore()
    result.body.dispose()
    result.handle!.dispose()
  })

  it('alça desligada gera só o corpo', () => {
    const { anchors } = setupDownloadMocks()
    parseMock.mockClear()
    const result: BuildMugResult = { body: new BoxGeometry(80, 88, 80), handle: null }

    exportMugStl(result, '')

    expect(anchors.map((anchor) => anchor.download)).toEqual(['caneca-corpo.stl'])
    expect(parseMock).toHaveBeenCalledTimes(1)

    result.body.dispose()
  })
})

describe('preparos de impressão', () => {
  it('prepara o corpo com a base em y = 0 e a alça em pé', () => {
    const body = new BoxGeometry(80, 88, 80)
    body.translate(10, 5, -20)
    const original = positions(body)
    const cloneSpy = vi.spyOn(BufferGeometry.prototype, 'clone')

    const preparedBody = prepareBodyForPrint(body)
    preparedBody.computeBoundingBox()

    expect(cloneSpy).toHaveBeenCalledTimes(1)
    expect(preparedBody).not.toBe(body)
    expect(preparedBody.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(preparedBody.boundingBox!.max.y).toBeCloseTo(88, 3)
    expect(preparedBody.boundingBox!.min.x).toBeCloseTo(-40, 3)
    expect(preparedBody.boundingBox!.max.x).toBeCloseTo(40, 3)
    expect(preparedBody.boundingBox!.min.z).toBeCloseTo(-40, 3)
    expect(preparedBody.boundingBox!.max.z).toBeCloseTo(40, 3)

    // Original não é mutado.
    body.computeBoundingBox()
    expect(body.boundingBox!.min.y).toBeCloseTo(-39, 3)
    expect(Array.from(body.getAttribute('position').array)).toEqual(Array.from(original))

    cloneSpy.mockRestore()
    body.dispose()
    preparedBody.dispose()
  })

  it('a alça real imprime em pé, sem rotação, com a base em y = 0', () => {
    const handle = buildHandle(defaultMugParams)
    const original = positions(handle)
    const loopHeight = defaultMugParams.handleGap + 2 * defaultMugParams.handleBand
    expect(loopHeight).toBeCloseTo(43, 3)

    const preparedHandle = prepareHandleForPrint(handle)
    preparedHandle.computeBoundingBox()
    const box = preparedHandle.boundingBox!

    // Base na mesa.
    expect(box.min.y).toBeCloseTo(0, 3)
    // Em pé: o vão do laço corre no eixo Y; se a peça fosse deitada, a altura
    // seria a espessura de handleWidth (12 mm), não 43 mm.
    expect(box.max.y - box.min.y).toBeCloseTo(loopHeight, 3)
    // A abraçadeira de 200° domina o plano XZ com ~84,6 mm de diâmetro; um span
    // nesse eixo acima de 80 mm só existe com a alça em pé.
    expect(box.max.z - box.min.z).toBeGreaterThan(80)
    // Centralizada na mesa em X e Z.
    expect(box.min.x).toBeCloseTo(-box.max.x, 3)
    expect(box.min.z).toBeCloseTo(-box.max.z, 3)

    // Original não é mutado (min Y = handleHeight − loopHeight / 2 = 30,5 mm).
    handle.computeBoundingBox()
    expect(handle.boundingBox!.min.y).toBeCloseTo(30.5, 3)
    expect(Array.from(handle.getAttribute('position').array)).toEqual(Array.from(original))

    handle.dispose()
    preparedHandle.dispose()
  })
})
