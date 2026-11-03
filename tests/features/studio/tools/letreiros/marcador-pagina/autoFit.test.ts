import * as THREE from 'three'
import { fitGeometryWidth } from '@/features/studio/tools/letreiros/marcador-pagina/autoFit'

function sizeOf(geometry: THREE.BufferGeometry): { width: number; height: number } {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  return { width: box.max.x - box.min.x, height: box.max.y - box.min.y }
}

describe('fitGeometryWidth', () => {
  it('reduz a largura sem alterar a altura', () => {
    const geometry = new THREE.BoxGeometry(20, 10, 1)
    fitGeometryWidth(geometry, 10)
    const size = sizeOf(geometry)
    expect(size.width).toBeCloseTo(10, 5)
    expect(size.height).toBeCloseTo(10, 5)
  })

  it('não amplia quando a geometria é menor que o alvo', () => {
    const geometry = new THREE.BoxGeometry(8, 10, 1)
    fitGeometryWidth(geometry, 10)
    const size = sizeOf(geometry)
    expect(size.width).toBeCloseTo(8, 5)
    expect(size.height).toBeCloseTo(10, 5)
  })

  it('não altera geometria vazia', () => {
    const geometry = new THREE.BufferGeometry()
    expect(() => fitGeometryWidth(geometry, 10)).not.toThrow()
    expect(geometry.getAttribute('position')).toBeUndefined()
  })
})
