import * as THREE from 'three'
import {
  deserializePhotoStandResult,
  serializePhotoStandResult,
} from '@/features/studio/tools/letreiros/suporte-foto/workerGeometry'
import type { BuildPhotoStandResult } from '@/features/studio/tools/letreiros/suporte-foto/buildPhotoStand'

function result(): BuildPhotoStandResult {
  return {
    base: new THREE.BoxGeometry(120, 25, 40),
    content: new THREE.BoxGeometry(40, 8, 1),
    contentItems: [{ id: 'c1', halfWidth: 20, halfHeight: 4 }],
  }
}

it('serializa e desserializa base, conteúdo e metadados', () => {
  const original = result()
  const { data, transfer } = serializePhotoStandResult(original)
  const restored = deserializePhotoStandResult(data)

  expect(restored.base.getAttribute('position').count).toBe(24)
  expect(restored.content?.getAttribute('position').count).toBe(24)
  expect(restored.contentItems).toEqual([
    { id: 'c1', halfWidth: 20, halfHeight: 4 },
  ])
  expect(restored.base.getAttribute('normal')).toBeDefined()
  expect(transfer).toHaveLength(8)
  expect(new Set(transfer).size).toBe(8)
  expect(data.base.position.buffer).toBe(transfer[0])
  expect(original.base.getAttribute('position').count).toBe(24)
})

it('não compartilha metadados com o resultado original', () => {
  const original = result()
  const { data } = serializePhotoStandResult(original)
  const restored = deserializePhotoStandResult(data)
  expect(restored.contentItems).not.toBe(data.contentItems)
  expect(restored.contentItems[0]).not.toBe(data.contentItems[0])
})

it('aceita conteúdo nulo', () => {
  const { data, transfer } = serializePhotoStandResult({ ...result(), content: null })
  expect(deserializePhotoStandResult(data).content).toBeNull()
  expect(transfer).toHaveLength(4)
})
