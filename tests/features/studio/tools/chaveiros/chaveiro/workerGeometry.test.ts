import * as THREE from 'three'
import { serializeKeychainResult, deserializeKeychainResult } from '@/features/studio/tools/chaveiros/chaveiro/workerGeometry'
import type { BuildKeychainResult } from '@/features/studio/tools/chaveiros/chaveiro/buildKeychain'

function result(): BuildKeychainResult {
  return {
    base: new THREE.BoxGeometry(10, 8, 3),
    content: new THREE.BoxGeometry(5, 2, 1),
    contentItems: [{ id: 'c1', halfWidth: 2.5, halfHeight: 1, geometry: null }],
    pieceBB: { minX: -5, maxX: 5, minY: -4, maxY: 4 },
    hole: { x: 0, y: 3, radius: 1.5 },
  }
}

it('serializa e desserializa base, conteúdo e metadados', () => {
  const { data } = serializeKeychainResult(result())
  const restored = deserializeKeychainResult(data)
  expect(restored.base.getAttribute('position').count).toBe(24)
  expect(restored.content).not.toBeNull()
  expect(restored.contentItems).toEqual([{ id: 'c1', halfWidth: 2.5, halfHeight: 1, geometry: null }])
  expect(restored.pieceBB).toEqual({ minX: -5, maxX: 5, minY: -4, maxY: 4 })
  expect(restored.hole).toEqual({ x: 0, y: 3, radius: 1.5 })
})

it('aceita conteúdo nulo', () => {
  const { data } = serializeKeychainResult({ ...result(), content: null })
  expect(deserializeKeychainResult(data).content).toBeNull()
})
