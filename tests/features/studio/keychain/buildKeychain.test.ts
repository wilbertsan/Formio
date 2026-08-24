import * as THREE from 'three'
import { buildKeychain, type BuildKeychainInput } from '@/features/studio/keychain/buildKeychain'
import { defaultKeychainParams, type KeychainParams } from '@/features/studio/keychain/schema'

const { csgCalls } = vi.hoisted(() => {
  const csgCalls: Array<{ base: THREE.BufferGeometry; text: THREE.BufferGeometry }> = []
  return { csgCalls }
})

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

vi.mock('three-bvh-csg', () => ({
  Brush: class {
    constructor(public geometry: THREE.BufferGeometry) {}
  },
  Evaluator: class {
    evaluate(a: { geometry: THREE.BufferGeometry }, b: { geometry: THREE.BufferGeometry }): THREE.BufferGeometry {
      csgCalls.push({ base: a.geometry, text: b.geometry })
      return a.geometry.clone()
    }
  },
  SUBTRACTION: 2,
}))

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
    csgCalls.length = 0
    const geometry = buildKeychain(makeInput({ params: { textMode: 'engraved' } as KeychainParams }))
    expect(geometry.getAttribute('position')).toBeDefined()
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
    expect(csgCalls).toHaveLength(1)
  })

  it('desloca texto para z >= thickness em raised', () => {
    const geometry = buildKeychain(makeInput())
    geometry.computeBoundingBox()
    expect(geometry.boundingBox?.max.z).toBeGreaterThan(defaultKeychainParams.thickness)
  })

  it('gravado não atravessa a base — verso fica intacto', () => {
    csgCalls.length = 0
    const geometry = buildKeychain(makeInput({ params: { textMode: 'engraved' } as KeychainParams }))
    geometry.computeBoundingBox()
    expect(geometry.boundingBox?.min.z).toBeGreaterThan(-0.3)
    expect(geometry.boundingBox?.max.z).toBeLessThanOrEqual(defaultKeychainParams.thickness + 0.3)
  })

  it('texto do CSG entra apenas pela face frontal', () => {
    csgCalls.length = 0
    buildKeychain(makeInput({ params: { textMode: 'engraved' } as KeychainParams }))
    expect(csgCalls).toHaveLength(1)
    const textGeometry = csgCalls[0]?.text
    expect(textGeometry).toBeDefined()
    textGeometry.computeBoundingBox()
    expect(textGeometry.boundingBox?.min.z).toBeGreaterThan(-0.01)
    expect(textGeometry.boundingBox?.max.z).toBeGreaterThan(defaultKeychainParams.thickness)
    const depth = (textGeometry.boundingBox?.max.z ?? 0) - (textGeometry.boundingBox?.min.z ?? 0)
    expect(depth).toBeLessThanOrEqual(defaultKeychainParams.letterHeight + 0.3)
  })
})
