import { describe, it, expect } from 'vitest'
import { BoxGeometry } from 'three'
import {
  deserializeBuildResult,
  deserializeGeometry,
  serializeBuildResult,
  serializeGeometry,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'

describe('workerGeometry', () => {
  it('faz roundtrip de posição, normal e índice', () => {
    const geometry = new BoxGeometry(10, 20, 30)
    const restored = deserializeGeometry(serializeGeometry(geometry).data)
    expect(restored.getAttribute('position').count).toBe(geometry.getAttribute('position').count)
    expect(restored.getAttribute('normal').count).toBe(geometry.getAttribute('normal').count)
    expect(restored.getIndex()).not.toBeNull()
  })

  it('serializa cinco peças e preserva nulos', () => {
    const result = {
      body: new BoxGeometry(1, 1, 1),
      lid: null,
      frontPanel: new BoxGeometry(2, 2, 2),
      handle: null,
      base: new BoxGeometry(3, 3, 3),
    }
    const { data, transfer } = serializeBuildResult(result)
    const restored = deserializeBuildResult(data)

    expect(restored.body.getAttribute('position').count).toBeGreaterThan(0)
    expect(restored.lid).toBeNull()
    expect(restored.frontPanel.getAttribute('position').count).toBeGreaterThan(0)
    expect(restored.handle).toBeNull()
    expect(restored.base!.getAttribute('position').count).toBeGreaterThan(0)
    expect(transfer.length).toBeGreaterThan(0)
  })
})
