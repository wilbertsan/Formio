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
  const original = result()
  const { data, transfer } = serializeKeychainResult(original)
  const restored = deserializeKeychainResult(data)

  expect(restored.base.getAttribute('position').count).toBe(24)
  expect(restored.content?.getAttribute('position').count).toBe(24)
  expect(restored.contentItems).toEqual([{ id: 'c1', halfWidth: 2.5, halfHeight: 1, geometry: null }])
  expect(restored.pieceBB).toEqual({ minX: -5, maxX: 5, minY: -4, maxY: 4 })
  expect(restored.hole).toEqual({ x: 0, y: 3, radius: 1.5 })
  expect(restored.base.getAttribute('normal')).toBeDefined()
  expect(restored.base.getAttribute('normal').count).toBe(24)

  expect(transfer).toHaveLength(8)
  expect(new Set(transfer).size).toBe(8)
  expect(data.base.position.buffer).toBe(transfer[0])

  expect(original.base.getAttribute('position').count).toBe(24)
  expect(original.content?.getAttribute('position').count).toBe(24)
})

it('não compartilha metadados com o resultado original', () => {
  const original = result()
  const { data } = serializeKeychainResult(original)
  const restored = deserializeKeychainResult(data)

  expect(data.pieceBB).not.toBe(original.pieceBB)
  expect(data.hole).not.toBe(original.hole)
  expect(restored.pieceBB).not.toBe(data.pieceBB)
  expect(restored.hole).not.toBe(data.hole)
})

it('aceita conteúdo nulo', () => {
  const { data, transfer } = serializeKeychainResult({ ...result(), content: null })
  expect(deserializeKeychainResult(data).content).toBeNull()
  expect(transfer).toHaveLength(4)
})
