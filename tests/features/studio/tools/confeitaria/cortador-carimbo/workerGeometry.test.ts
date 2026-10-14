import { describe, it, expect } from 'vitest'
import { ExtrudeGeometry, Shape, Vector2 } from 'three'
import {
  deserializeBuildResult,
  deserializeGeometry,
  serializeBuildResult,
  serializeGeometry,
} from '@/features/studio/tools/confeitaria/cortador-carimbo/workerGeometry'
import type { BuildCutterStampResult } from '@/features/studio/tools/confeitaria/cortador-carimbo/buildCutterStamp'

function rectGeometry(depth: number): ExtrudeGeometry {
  const shape = new Shape([
    new Vector2(-5, -5),
    new Vector2(5, -5),
    new Vector2(5, 5),
    new Vector2(-5, 5),
  ])
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false })
}

describe('workerGeometry', () => {
  it('round-trip preserva contagem e bounding box', () => {
    const geometry = rectGeometry(2)
    geometry.computeBoundingBox()

    const { data, transfer } = serializeGeometry(geometry)
    const restored = deserializeGeometry(data)
    restored.computeBoundingBox()

    expect(restored.attributes.position.count).toBe(geometry.attributes.position.count)
    expect(restored.attributes.normal.count).toBe(geometry.attributes.normal.count)
    expect(restored.boundingBox!.max.z).toBeCloseTo(geometry.boundingBox!.max.z, 5)
    expect(transfer.length).toBeGreaterThan(0)
  })

  it('round-trip do resultado completo preserva as quatro peças', () => {
    const result = {
      cutter: rectGeometry(3),
      stampBase: rectGeometry(2),
      stampRelief: rectGeometry(1),
      stampHandle: rectGeometry(1),
    } as unknown as BuildCutterStampResult

    const { data, transfer } = serializeBuildResult(result)
    const restored = deserializeBuildResult(data)

    expect(restored.cutter.attributes.position.count).toBe(result.cutter.attributes.position.count)
    expect(restored.stampBase.attributes.position.count).toBe(result.stampBase.attributes.position.count)
    expect(restored.stampRelief.attributes.position.count).toBe(result.stampRelief.attributes.position.count)
    expect(restored.stampHandle.attributes.position.count).toBe(result.stampHandle.attributes.position.count)
    expect(transfer.length).toBeGreaterThanOrEqual(4)
  })
})
