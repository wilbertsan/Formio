import { describe, it, expect, vi, afterEach } from 'vitest'
import { BoxGeometry, type BufferGeometry } from 'three'
import {
  exportBoxStl,
  prepareLidForPrint,
  preparePanelForPrint,
} from '@/features/studio/tools/lembrancinhas/caixa-personalizada/exportStl'
import { buildHandle, prepareHandleForPrint } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/buildHandle'
import { defaultBoxParams } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/schema'
import type { BuildBoxResult } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/buildBox'

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class {
    parse = vi.fn(() => new ArrayBuffer(84))
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
  Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, writable: true })
  Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true })

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
  return { anchors, createElementSpy, appendChildSpy, removeChildSpy }
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

describe('exportBoxStl', () => {
  it('baixa as peças habilitadas com nomes separados', () => {
    const { anchors, appendChildSpy, removeChildSpy } = setupDownloadMocks()
    const result: BuildBoxResult = {
      body: new BoxGeometry(10, 10, 10),
      lid: new BoxGeometry(10, 5, 10),
      frontPanel: new BoxGeometry(8, 8, 1),
      handle: buildHandle(defaultBoxParams),
      base: new BoxGeometry(12, 2, 12),
    }

    exportBoxStl(result, 'Meu Termo!', defaultBoxParams)

    expect(anchors).toHaveLength(5)
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'Meu-Termo-corpo.stl',
      'Meu-Termo-tampa.stl',
      'Meu-Termo-painel.stl',
      'Meu-Termo-puxador.stl',
      'Meu-Termo-base.stl',
    ])
    expect(anchors.every((anchor) => anchor.click.mock.calls.length === 1)).toBe(true)
    expect(anchors[0].href).toBe('blob:mock-url')
    expect(appendChildSpy).toHaveBeenCalledTimes(5)
    expect(removeChildSpy).toHaveBeenCalledTimes(5)

    result.body.dispose()
    result.lid?.dispose()
    result.frontPanel.dispose()
    result.handle?.dispose()
    result.base?.dispose()
  })

  it('omite peças desabilitadas', () => {
    const { anchors, appendChildSpy, removeChildSpy } = setupDownloadMocks()
    const result: BuildBoxResult = {
      body: new BoxGeometry(10, 10, 10),
      lid: null,
      frontPanel: new BoxGeometry(8, 8, 1),
      handle: null,
      base: null,
    }
    exportBoxStl(result, 'Corpo', defaultBoxParams)
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'Corpo-corpo.stl',
      'Corpo-painel.stl',
    ])
    expect(appendChildSpy).toHaveBeenCalledTimes(2)
    expect(removeChildSpy).toHaveBeenCalledTimes(2)

    result.body.dispose()
    result.frontPanel.dispose()
  })

  it('usa o nome padrão quando o projeto não tem nome', () => {
    const { anchors } = setupDownloadMocks()
    const result: BuildBoxResult = {
      body: new BoxGeometry(10, 10, 10),
      lid: null,
      frontPanel: new BoxGeometry(8, 8, 1),
      handle: null,
      base: null,
    }

    exportBoxStl(result, '', defaultBoxParams)

    expect(anchors[0].download).toBe('caixa-personalizada-corpo.stl')

    result.body.dispose()
    result.frontPanel.dispose()
  })
})

describe('preparos de impressão', () => {
  it('deita a tampa com a face superior na mesa sem mutar o original', () => {
    const lid = new BoxGeometry(10, 14.4, 10)
    lid.translate(0, 7.2, 0)
    const original = positions(lid)
    const position = lid.getAttribute('position')

    const topIndices: number[] = []
    for (let i = 0; i < position.count; i++) {
      if (Math.abs(position.getY(i) - 14.4) < 1e-4) {
        topIndices.push(i)
      }
    }
    expect(topIndices.length).toBeGreaterThan(0)

    const lidPrint = prepareLidForPrint(lid)
    lidPrint.computeBoundingBox()
    const printPosition = lidPrint.getAttribute('position')
    // A rotação de 180° põe a face superior (y=14.4) na mesa (y=0).
    expect(lidPrint.boundingBox!.max.y).toBeCloseTo(14.4, 3)
    for (const topIndex of topIndices) {
      expect(printPosition.getY(topIndex)).toBeCloseTo(0, 3)
    }
    expect(Array.from(lid.getAttribute('position').array)).toEqual(Array.from(original))

    lid.dispose()
    lidPrint.dispose()
  })

  it('deita o painel com a face frontal para cima sem mutar o original', () => {
    const panel = new BoxGeometry(140, 50, 3)
    panel.translate(0, 0, 60)
    const original = positions(panel)
    const position = panel.getAttribute('position')

    let frontIndex = -1
    for (let i = 0; i < position.count; i++) {
      if (Math.abs(position.getZ(i) - 61.5) < 1e-4) {
        frontIndex = i
        break
      }
    }
    expect(frontIndex).toBeGreaterThanOrEqual(0)

    const panelPrint = preparePanelForPrint(panel)
    const printPosition = panelPrint.getAttribute('position')
    // A face frontal (z=61.5) fica em y=3 acima da face traseira apoiada em y=0.
    expect(printPosition.getY(frontIndex)).toBeCloseTo(3, 3)
    expect(Array.from(panel.getAttribute('position').array)).toEqual(Array.from(original))

    panel.dispose()
    panelPrint.dispose()
  })

  it('devolve o puxador para a vertical com a base na mesa sem mutar o original', () => {
    const handle = buildHandle(defaultBoxParams)
    const original = positions(handle)
    const print = prepareHandleForPrint(handle, defaultBoxParams)
    print.computeBoundingBox()
    expect(print.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(print.boundingBox!.max.y).toBeCloseTo(defaultBoxParams.handleLength, 3)
    expect(Array.from(handle.getAttribute('position').array)).toEqual(Array.from(original))

    handle.dispose()
    print.dispose()
  })
})
