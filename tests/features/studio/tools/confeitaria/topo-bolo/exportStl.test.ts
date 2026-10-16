import * as THREE from 'three'
import { exportCakeTopperStl } from '@/features/studio/tools/confeitaria/topo-bolo/exportStl'

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

interface DownloadHarness {
  createObjectURL: ReturnType<typeof vi.fn>
  revokeObjectURL: ReturnType<typeof vi.fn>
  clickSpy: ReturnType<typeof vi.fn>
  appendChildSpy: ReturnType<typeof vi.fn>
  removeChildSpy: ReturnType<typeof vi.fn>
  anchorStub: { click: () => void; href: string; download: string }
  restore: () => void
}

function setupDownloadHarness(): DownloadHarness {
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

  return {
    createObjectURL,
    revokeObjectURL,
    clickSpy,
    appendChildSpy,
    removeChildSpy,
    anchorStub,
    restore: () => {
      createElementSpy.mockRestore()
      Object.defineProperty(document.body, 'appendChild', { value: appendChildOrig, writable: true })
      Object.defineProperty(document.body, 'removeChild', { value: removeChildOrig, writable: true })
    },
  }
}

describe('exportCakeTopperStl', () => {
  it('gera download com blob e nome sanitizado', () => {
    const harness = setupDownloadHarness()

    const plate = new THREE.BoxGeometry(80, 50, 3)
    const relief = new THREE.BoxGeometry(40, 10, 1)
    const support = new THREE.CylinderGeometry(2, 2, 40, 24)
    exportCakeTopperStl({ plate, relief, support }, 'Meu Topo! @#')

    expect(harness.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.anchorStub.download).toBe('Meu-Topo.stl')
    expect(harness.clickSpy).toHaveBeenCalledTimes(1)
    expect(harness.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(harness.appendChildSpy).toHaveBeenCalledTimes(1)
    expect(harness.removeChildSpy).toHaveBeenCalledTimes(1)

    harness.restore()
  })

  it('exporta apenas a placa quando relevo e suporte são nulos', () => {
    const harness = setupDownloadHarness()

    const plate = new THREE.BoxGeometry(80, 50, 3)
    exportCakeTopperStl({ plate, relief: null, support: null }, 'Sem relevo')

    expect(harness.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.clickSpy).toHaveBeenCalledTimes(1)
    expect(harness.anchorStub.download).toBe('Sem-relevo.stl')

    harness.restore()
  })

  it('exporta placa, relevo e suporte quando todos existem', () => {
    const harness = setupDownloadHarness()

    const plate = new THREE.BoxGeometry(80, 50, 3)
    const relief = new THREE.BoxGeometry(40, 10, 1)
    const support = new THREE.CylinderGeometry(2, 2, 40, 24)
    exportCakeTopperStl({ plate, relief, support }, 'Tres partes')

    const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.clickSpy).toHaveBeenCalledTimes(1)
    expect(harness.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(harness.appendChildSpy).toHaveBeenCalledTimes(1)
    expect(harness.removeChildSpy).toHaveBeenCalledTimes(1)

    harness.restore()
  })
})
