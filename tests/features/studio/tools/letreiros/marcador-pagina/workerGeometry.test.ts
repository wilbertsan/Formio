import * as THREE from 'three'
import {
  serializeBookmarkResult,
  deserializeBookmarkResult,
} from '@/features/studio/tools/letreiros/marcador-pagina/workerGeometry'
import type { BuildBookmarkResult } from '@/features/studio/tools/letreiros/marcador-pagina/buildBookmark'

function result(): BuildBookmarkResult {
  return {
    base: new THREE.BoxGeometry(120, 40, 2),
    text: new THREE.BoxGeometry(1, 40, 8),
  }
}

describe('workerGeometry', () => {
  it('serializa e desserializa base e texto', () => {
    const { data, transfer } = serializeBookmarkResult(result())
    const restored = deserializeBookmarkResult(data)

    expect(restored.base.getAttribute('position').count).toBe(24)
    expect(restored.text.getAttribute('position').count).toBe(24)
    expect(restored.base.getAttribute('normal')).toBeDefined()
    expect(transfer).toHaveLength(8)
    expect(new Set(transfer).size).toBe(8)
    expect(data.base.position.buffer).toBe(transfer[0])
  })

  it('não compartilha arrays com o resultado original', () => {
    const original = result()
    const { data } = serializeBookmarkResult(original)
    expect(data.base.position).not.toBe(original.base.getAttribute('position').array)
  })
})
