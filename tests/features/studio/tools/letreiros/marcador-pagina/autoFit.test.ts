import * as THREE from 'three'
import { fitGeometryWidth } from '@/features/studio/tools/letreiros/marcador-pagina/autoFit'

function widthOf(geometry: THREE.BufferGeometry): number {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  return box.max.x - box.min.x
}

describe('fitGeometryWidth', () => {
  it('reduz a geometria quando excede a largura alvo', () => {
    const geometry = new THREE.BoxGeometry(20, 10, 1)
    fitGeometryWidth(geometry, 10)
    expect(widthOf(geometry)).toBeCloseTo(10, 5)
  })

  it('não amplia quando a geometria é menor que o alvo', () => {
    const geometry = new THREE.BoxGeometry(8, 10, 1)
    fitGeometryWidth(geometry, 10)
    expect(widthOf(geometry)).toBeCloseTo(8, 5)
  })

  it('não altera geometria vazia', () => {
    const geometry = new THREE.BufferGeometry()
    expect(() => fitGeometryWidth(geometry, 10)).not.toThrow()
    expect(geometry.getAttribute('position')).toBeUndefined()
  })
})
