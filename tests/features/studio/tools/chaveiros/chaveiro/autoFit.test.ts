import * as THREE from 'three'
import { fitGeometryToRegion, getUsableRegion } from '@/features/studio/tools/chaveiros/chaveiro/autoFit'
import { defaultKeychainParams } from '@/features/studio/tools/chaveiros/chaveiro/schema'

it('retângulo usa área interna à borda', () => {
  const region = getUsableRegion({ ...defaultKeychainParams, borderWidth: 4, width: 50, height: 25 })!
  expect(region).toEqual({ kind: 'rect', minX: -21, maxX: 21, minY: -8.5, maxY: 8.5 })
})

it('círculo usa raio interno', () => {
  const region = getUsableRegion({
    ...defaultKeychainParams, baseShape: 'circle', width: 40, borderWidth: 5,
  })!
  expect(region).toEqual({ kind: 'circle', cx: 0, cy: 0, radius: 15 })
})

it('nunca aumenta e centraliza', () => {
  const geo = new THREE.BoxGeometry(100, 20, 1)
  fitGeometryToRegion(geo, { kind: 'rect', minX: -10, maxX: 10, minY: -10, maxY: 10 })
  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  expect(bb.max.x - bb.min.x).toBeLessThanOrEqual(20.01)
  expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(0)
  expect(bb.min.z).toBeCloseTo(0)
})

it('name não tem região de auto-fit', () => {
  expect(getUsableRegion({ ...defaultKeychainParams, baseShape: 'name' })).toBeNull()
})
