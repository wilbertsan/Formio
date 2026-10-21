import { describe, it, expect } from 'vitest'
import { BufferAttribute, BufferGeometry } from 'three'
import {
  deserializeGeometry, serializeBuildResult, deserializeBuildResult, serializeGeometry,
} from '@/features/studio/tools/confeitaria/rolo-textura/workerGeometry'

function sampleGeometry(): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3))
  g.setAttribute('normal', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3))
  g.setIndex([0, 1, 2])
  g.addGroup(0, 3, 0)
  g.addGroup(0, 2, 1)
  return g
}

describe('workerGeometry', () => {
  it('serializa e reconstrói posição/normal/índice', () => {
    const restored = deserializeGeometry(serializeGeometry(sampleGeometry()).data)
    expect(restored.getAttribute('position').count).toBe(3)
    expect(restored.getAttribute('normal').count).toBe(3)
    expect(restored.getIndex()!.count).toBe(3)
  })

  it('preserva os grupos de material no roundtrip', () => {
    const restored = deserializeGeometry(serializeGeometry(sampleGeometry()).data)
    expect(restored.groups).toEqual([
      { start: 0, count: 3, materialIndex: 0 },
      { start: 0, count: 2, materialIndex: 1 },
    ])
  })

  it('serializa e reconstrói o resultado do build', () => {
    const geometry = sampleGeometry()
    const { data, transfer } = serializeBuildResult({ roller: geometry })
    expect(transfer.length).toBeGreaterThan(0)
    const restored = deserializeBuildResult(data)
    expect(restored.roller.getAttribute('position').count).toBe(3)
  })
})
