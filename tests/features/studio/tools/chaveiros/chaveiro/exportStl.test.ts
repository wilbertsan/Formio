import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { exportStl } from '@/features/studio/tools/chaveiros/chaveiro/exportStl'
import type { BuildKeychainResult } from '@/features/studio/tools/chaveiros/chaveiro/buildKeychain'

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: vi.fn((geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    return geos[0].clone()
  }),
}))

const PIECE_BB = { minX: -5, maxX: 5, minY: -5, maxY: 5 }
const HOLE = { x: 0, y: 0, radius: 0 }

function makeGeometry(content: THREE.BufferGeometry | null): BuildKeychainResult {
  return {
    base: new THREE.BoxGeometry(10, 10, 10),
    content,
    contentItems: [],
    pieceBB: PIECE_BB,
    hole: HOLE,
  }
}

function stubDownloadEnvironment() {
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

  const clickSpy = vi.fn()
  const anchorStub = { click: clickSpy, href: '', download: '' }
  const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorStub as never)
  const appendChildSpy = vi.fn()
  const removeChildSpy = vi.fn()
  const appendChildOrig = document.body.appendChild.bind(document.body)
  const removeChildOrig = document.body.removeChild.bind(document.body)
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

  const restore = () => {
    createElementSpy.mockRestore()
    Object.defineProperty(document.body, 'appendChild', {
      value: appendChildOrig,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(document.body, 'removeChild', {
      value: removeChildOrig,
      writable: true,
      configurable: true,
    })
  }

  return { createObjectURL, revokeObjectURL, clickSpy, anchorStub, restore }
}

describe('exportStl', () => {
  beforeEach(() => {
    vi.mocked(mergeGeometries).mockClear()
  })

  it('gera download com blob e nome sanitizado', () => {
    const env = stubDownloadEnvironment()

    exportStl(makeGeometry(new THREE.BoxGeometry(5, 5, 5)), 'Meu Projeto! @#')

    expect(env.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (env.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(env.anchorStub.download).toBe('Meu-Projeto.stl')
    expect(env.clickSpy).toHaveBeenCalledTimes(1)
    expect(env.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    env.restore()
  })

  it('combina apenas a base quando não há conteúdo', () => {
    const env = stubDownloadEnvironment()
    const geometry = makeGeometry(null)

    exportStl(geometry, 'Sem conteúdo')

    expect(vi.mocked(mergeGeometries)).toHaveBeenCalledWith([geometry.base])

    env.restore()
  })
})
