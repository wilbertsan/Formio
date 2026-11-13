import { describe, it, expect, vi } from 'vitest'
import { BoxGeometry } from 'three'
import {
  exportThermoformerStl,
  prepareLidForPrint,
  preparePanelForPrint,
} from '@/features/studio/tools/lembrancinhas/termoformador/exportStl'
import { buildHandle, prepareHandleForPrint } from '@/features/studio/tools/lembrancinhas/termoformador/buildHandle'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import type { BuildThermoformerResult } from '@/features/studio/tools/lembrancinhas/termoformador/buildThermoformer'

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class {
    parse = vi.fn(() => new ArrayBuffer(84))
  },
}))

function setupDownloadMocks() {
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()
  Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, writable: true })
  Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true })

  const anchors: Array<{ click: ReturnType<typeof vi.fn>; href: string; download: string }> = []
  const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(() => {
    const anchor = { click: vi.fn(), href: '', download: '' }
    anchors.push(anchor)
    return anchor as never
  })
  const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as never)
  const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as never)
  return { anchors, createElementSpy, appendChildSpy, removeChildSpy }
}

describe('exportThermoformerStl', () => {
  it('baixa as peças habilitadas com nomes separados', () => {
    const { anchors, createElementSpy, appendChildSpy, removeChildSpy } = setupDownloadMocks()
    const result: BuildThermoformerResult = {
      body: new BoxGeometry(10, 10, 10),
      lid: new BoxGeometry(10, 5, 10),
      frontPanel: new BoxGeometry(8, 8, 1),
      handle: buildHandle(defaultThermoformerParams),
      base: new BoxGeometry(12, 2, 12),
    }

    exportThermoformerStl(result, 'Meu Termo!', defaultThermoformerParams)

    expect(anchors).toHaveLength(5)
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'Meu-Termo-corpo.stl',
      'Meu-Termo-tampa.stl',
      'Meu-Termo-painel.stl',
      'Meu-Termo-pino.stl',
      'Meu-Termo-base.stl',
    ])
    expect(anchors.every((anchor) => anchor.click.mock.calls.length === 1)).toBe(true)

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })

  it('omite peças desabilitadas', () => {
    const { anchors, createElementSpy, appendChildSpy, removeChildSpy } = setupDownloadMocks()
    exportThermoformerStl({
      body: new BoxGeometry(10, 10, 10),
      lid: null,
      frontPanel: new BoxGeometry(8, 8, 1),
      handle: null,
      base: null,
    }, 'Corpo', defaultThermoformerParams)
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'Corpo-corpo.stl',
      'Corpo-painel.stl',
    ])
    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })
})

describe('preparos de impressão', () => {
  it('deita a tampa e o painel sem mutar o original', () => {
    const lid = new BoxGeometry(10, 14.4, 10)
    lid.translate(0, 7.2, 0)
    const panel = new BoxGeometry(140, 50, 3)
    panel.translate(0, 0, 60)

    const lidPrint = prepareLidForPrint(lid)
    lidPrint.computeBoundingBox()
    expect(lidPrint.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(lidPrint.boundingBox!.max.y).toBeCloseTo(14.4, 3)

    const panelPrint = preparePanelForPrint(panel)
    panelPrint.computeBoundingBox()
    expect(panelPrint.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(panelPrint.boundingBox!.max.y).toBeCloseTo(3, 3)

    lid.computeBoundingBox()
    expect(lid.boundingBox!.min.y).toBeCloseTo(0, 3)
  })

  it('devolve o pino para a vertical com a base na mesa', () => {
    const handle = buildHandle(defaultThermoformerParams)
    const print = prepareHandleForPrint(handle, defaultThermoformerParams)
    print.computeBoundingBox()
    expect(print.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(print.boundingBox!.max.y).toBeCloseTo(defaultThermoformerParams.handleLength, 3)
  })
})
