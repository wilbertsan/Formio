import * as THREE from 'three'
import {
  exportStlParts,
  prepareTextForPrint,
} from '@/features/studio/tools/letreiros/marcador-pagina/exportStl'

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class {
    parse() {
      return new ArrayBuffer(100)
    }
  },
}))

describe('prepareTextForPrint', () => {
  it('deita o texto com a face frontal na mesa', () => {
    const text = new THREE.BoxGeometry(5, 40, 10)
    text.translate(0.5, 0, 0.5)

    const prepared = prepareTextForPrint(text)
    prepared.computeBoundingBox()
    const box = prepared.boundingBox!

    expect(box.min.x).toBeCloseTo(-4.5, 3)
    expect(box.max.x).toBeCloseTo(5.5, 3)
    expect(box.min.y).toBeCloseTo(-20)
    expect(box.max.y).toBeCloseTo(20)
    expect(box.min.z).toBeCloseTo(0)
    expect(box.max.z).toBeCloseTo(5)

    text.computeBoundingBox()
    expect(text.boundingBox!.max.z).toBeCloseTo(5.5, 3)
    prepared.dispose()
  })
})

describe('exportStlParts', () => {
  it('baixa base e texto em arquivos separados', () => {
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

    const base = new THREE.BoxGeometry(10, 10, 10)
    const text = new THREE.BoxGeometry(2.5, 40, 8)
    text.translate(-0.25, 0, 4)

    exportStlParts({ base, text }, 'Meu Marcador! @#')

    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(anchors).toHaveLength(2)
    expect(anchors[0].download).toBe('Meu-Marcador-base.stl')
    expect(anchors[1].download).toBe('Meu-Marcador-texto.stl')
    expect(anchors[0].click).toHaveBeenCalledTimes(1)
    expect(anchors[1].click).toHaveBeenCalledTimes(1)
    expect(appendChildSpy).toHaveBeenCalledTimes(2)
    expect(removeChildSpy).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })
})
