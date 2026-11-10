import * as THREE from 'three'
import {
  deserializeCardResult,
  serializeCardResult,
} from '@/features/studio/tools/letreiros/cartao-visita/workerGeometry'
import type { BuildCardResult } from '@/features/studio/tools/letreiros/cartao-visita/buildCard'

function result(): BuildCardResult {
  return {
    base: new THREE.BoxGeometry(10, 8, 3),
    content: new THREE.BoxGeometry(5, 2, 1),
    contentItems: [{ id: 'c1', halfWidth: 2.5, halfHeight: 1, geometry: null }],
  }
}

it('serializa e desserializa base, conteúdo e metadados', () => {
  const original = result()
  const { data, transfer } = serializeCardResult(original)
  const restored = deserializeCardResult(data)

  expect(restored.base.getAttribute('position').count).toBe(24)
  expect(restored.content?.getAttribute('position').count).toBe(24)
  expect(restored.contentItems).toEqual([
    { id: 'c1', halfWidth: 2.5, halfHeight: 1, geometry: null },
  ])
  expect(restored.base.getAttribute('normal')).toBeDefined()
  expect(transfer).toHaveLength(8)
  expect(new Set(transfer).size).toBe(8)
  expect(data.base.position.buffer).toBe(transfer[0])
  expect(original.base.getAttribute('position').count).toBe(24)
})

it('não compartilha metadados com o resultado original', () => {
  const original = result()
  const { data } = serializeCardResult(original)
  const restored = deserializeCardResult(data)
  expect(restored.contentItems).not.toBe(data.contentItems)
  expect(restored.contentItems[0]).not.toBe(data.contentItems[0])
})

it('aceita conteúdo nulo', () => {
  const { data, transfer } = serializeCardResult({ ...result(), content: null })
  expect(deserializeCardResult(data).content).toBeNull()
  expect(transfer).toHaveLength(4)
})
