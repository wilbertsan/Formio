import * as THREE from 'three'
import { createBaseShape, getHolePosition } from '@/features/studio/keychain/shapes'

describe('createBaseShape', () => {
  it('retângulo com um furo e bounding box aproximado', () => {
    const shape = createBaseShape('rect', 50, 25, 5)
    expect(shape.holes).toHaveLength(1)
    const geometry = new THREE.ShapeGeometry(shape)
    geometry.computeBoundingBox()
    const size = new THREE.Vector3()
    geometry.boundingBox?.getSize(size)
    expect(size.x).toBeGreaterThan(45)
    expect(size.x).toBeLessThanOrEqual(50)
    expect(size.y).toBeGreaterThan(20)
    expect(size.y).toBeLessThanOrEqual(25)
  })

  it('círculo com um furo, diâmetro = width', () => {
    const shape = createBaseShape('circle', 50, 25, 5)
    expect(shape.holes).toHaveLength(1)
    const geometry = new THREE.ShapeGeometry(shape)
    geometry.computeBoundingBox()
    const size = new THREE.Vector3()
    geometry.boundingBox?.getSize(size)
    expect(size.x).toBeGreaterThan(45)
    expect(size.y).toBeGreaterThan(45)
  })

  it('coração com um furo e bounding box positivo', () => {
    const shape = createBaseShape('heart', 50, 25, 5)
    expect(shape.holes).toHaveLength(1)
    const geometry = new THREE.ShapeGeometry(shape)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox).not.toBeNull()
    const size = new THREE.Vector3()
    geometry.boundingBox?.getSize(size)
    expect(size.x).toBeGreaterThan(30)
    expect(size.y).toBeGreaterThan(20)
  })

  it('furo dentro dos limites para todas as formas', () => {
    for (const shapeType of ['rect', 'circle', 'heart'] as const) {
      const shape = createBaseShape(shapeType, 50, 25, 5)
      const hole = shape.holes[0]
      expect(hole).toBeDefined()
      const holePoints = hole.getPoints(32)
      for (const point of holePoints) {
        expect(point.x).toBeGreaterThan(-40)
        expect(point.x).toBeLessThan(40)
        expect(point.y).toBeGreaterThan(-20)
        expect(point.y).toBeLessThan(30)
      }
    }
  })
})

describe('getHolePosition', () => {
  it('retorna posição no topo para cada forma', () => {
    const rect = getHolePosition('rect', 50, 25)
    const circle = getHolePosition('circle', 50, 25)
    const heart = getHolePosition('heart', 50, 25)
    expect(rect.y).toBeGreaterThan(0)
    expect(circle.y).toBeGreaterThan(0)
    expect(heart.y).toBeGreaterThan(0)
  })
})
