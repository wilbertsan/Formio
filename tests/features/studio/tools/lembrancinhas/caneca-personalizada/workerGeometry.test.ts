import { describe, it, expect } from 'vitest'
import { BoxGeometry } from 'three'
import {
  deserializeBuildResult,
  serializeBuildResult,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/workerGeometry'
import type { BuildMugResult } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug'

describe('workerGeometry', () => {
  it('faz round-trip das duas peças', () => {
    const result: BuildMugResult = {
      body: new BoxGeometry(80, 88, 80),
      handle: new BoxGeometry(50, 40, 12),
    }
    const { data, transfer } = serializeBuildResult(result)
    expect(data.body.position.length).toBeGreaterThan(0)
    expect(data.handle).not.toBeNull()
    expect(transfer.length).toBeGreaterThanOrEqual(4)

    const restored = deserializeBuildResult(data)
    restored.body.computeBoundingBox()
    expect(restored.body.boundingBox!.max.y).toBeCloseTo(44, 5)
    expect(restored.handle).not.toBeNull()
    expect(restored.handle!.getAttribute('position').count).toBe(
      result.handle!.getAttribute('position').count,
    )

    result.body.dispose()
    result.handle!.dispose()
    restored.body.dispose()
    restored.handle!.dispose()
  })

  it('aceita alça nula', () => {
    const { data } = serializeBuildResult({
      body: new BoxGeometry(80, 88, 80),
      handle: null,
    })
    expect(data.handle).toBeNull()
    const restored = deserializeBuildResult(data)
    expect(restored.handle).toBeNull()
    restored.body.dispose()
  })
})
