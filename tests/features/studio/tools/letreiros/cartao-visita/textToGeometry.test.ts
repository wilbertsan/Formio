import * as THREE from 'three'
import { textToGeometry } from '@/features/studio/tools/letreiros/cartao-visita/textToGeometry'

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor(_text: string, parameters: { size: number; depth: number }) {
      super()
      const w = parameters.size * 4
      const h = parameters.size
      const d = parameters.depth
      this.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0,
           -w / 2, -h / 2, d, w / 2, -h / 2, d, w / 2, h / 2, d, -w / 2, h / 2, d],
          3,
        ),
      )
      this.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 7, 4, 0, 3, 7, 1, 5, 6, 1, 6, 2])
    }
  },
}))

const fontStub = { glyphs: {} } as never

describe('textToGeometry', () => {
  it('gera geometria centralizada com proporção do tamanho', () => {
    const geometry = textToGeometry({ font: fontStub, text: 'ANA', size: 16, depth: 1 })
    geometry.computeBoundingBox()
    const size = new THREE.Vector3()
    geometry.boundingBox?.getSize(size)
    expect(size.x).toBeCloseTo(64, 0)
    expect(size.y).toBeCloseTo(16, 0)
    expect(geometry.boundingBox?.min.x).toBeCloseTo(-size.x / 2, 0)
  })

  it('usa depth como profundidade em z', () => {
    const geometry = textToGeometry({ font: fontStub, text: 'ANA', size: 16, depth: 1 })
    geometry.computeBoundingBox()
    expect(geometry.boundingBox?.max.z).toBeGreaterThan(0)
  })
})
