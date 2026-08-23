import * as THREE from 'three'
import { buildKeychain, type BuildKeychainInput } from '@/features/studio/keychain/buildKeychain'
import { defaultKeychainParams, type KeychainParams } from '@/features/studio/keychain/schema'

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor(_text?: string, parameters?: { size: number; depth: number }) {
      super()
      if (!parameters) return
      const w = parameters.size * 4
      const h = parameters.size
      const d = parameters.depth
      this.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [
            -w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0,
            -w / 2, -h / 2, d, w / 2, -h / 2, d, w / 2, h / 2, d, -w / 2, h / 2, d,
          ],
          3,
        ),
      )
      this.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 7, 4, 0, 3, 7, 1, 5, 6, 1, 6, 2])
    }
  },
}))

vi.mock('three-bvh-csg', () => {
  class MockBrush {
    constructor(public geometry: THREE.BufferGeometry) {}
  }
  return {
    Brush: MockBrush,
    Evaluator: class {
      evaluate(a: MockBrush, _b: MockBrush): THREE.BufferGeometry { // eslint-disable-line @typescript-eslint/no-unused-vars
        return a.geometry.clone()
      }
    },
    SUBTRACTION: 2,
  }
})

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: (geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    const merged = new THREE.BufferGeometry()
    Object.assign(merged, geos[0].clone())
    return merged
  },
}))

const fontStub = { glyphs: {} } as never

function makeInput(overrides?: Partial<BuildKeychainInput>): BuildKeychainInput {
  return {
    font: fontStub,
    params: { ...defaultKeychainParams, ...overrides?.params },
    onError: () => undefined,
  }
}

describe('buildKeychain', () => {
  it('modo raised retorna geometria com atributos de posição', () => {
    const geometry = buildKeychain(makeInput())
    expect(geometry.getAttribute('position')).toBeDefined()
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
  })

  it('modo engraved usa CSG e retorna geometria', () => {
    const geometry = buildKeychain(makeInput({ params: { textMode: 'engraved' } as KeychainParams }))
    expect(geometry.getAttribute('position')).toBeDefined()
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
  })

  it('desloca texto para z >= thickness em raised', () => {
    const geometry = buildKeychain(makeInput())
    geometry.computeBoundingBox()
    expect(geometry.boundingBox?.max.z).toBeGreaterThan(defaultKeychainParams.thickness)
  })
})
