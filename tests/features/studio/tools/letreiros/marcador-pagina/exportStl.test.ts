import * as THREE from 'three'
import { exportStl } from '@/features/studio/tools/letreiros/marcador-pagina/exportStl'

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: vi.fn((geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    return geos[0].clone()
  }),
}))

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class {
    parse() {
      return new ArrayBuffer(100)
    }
  },
}))

describe('exportStl', () => {
  it('gera download com blob e nome sanitizado', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, writable: true })
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true })

    const clickSpy = vi.fn()
    const appendChildSpy = vi.fn()
    const removeChildSpy = vi.fn()
    const anchorStub = { click: clickSpy, href: '', download: '' }
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorStub as never)
    const appendChildOrig = document.body.appendChild.bind(document.body)
    const removeChildOrig = document.body.removeChild.bind(document.body)
    Object.defineProperty(document.body, 'appendChild', { value: appendChildSpy, writable: true })
    Object.defineProperty(document.body, 'removeChild', { value: removeChildSpy, writable: true })

    const base = new THREE.BoxGeometry(10, 10, 10)
    const text = new THREE.BoxGeometry(5, 5, 5)
    exportStl({ base, text, textItems: [] }, 'Meu Marcador! @#')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(anchorStub.download).toBe('Meu-Marcador.stl')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(appendChildSpy).toHaveBeenCalledTimes(1)
    expect(removeChildSpy).toHaveBeenCalledTimes(1)

    createElementSpy.mockRestore()
    Object.defineProperty(document.body, 'appendChild', { value: appendChildOrig, writable: true })
    Object.defineProperty(document.body, 'removeChild', { value: removeChildOrig, writable: true })
  })
})