import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
} from 'three'
import {
  deserializeBuildResult,
  serializeBuildResult,
} from '@/features/studio/tools/lembrancinhas/porta-lata/workerGeometry'
import type { CanHolderBuildResult } from '@/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder'

const tracked: BufferGeometry[] = []

function track<T extends BufferGeometry>(geometry: T): T {
  tracked.push(geometry)
  return geometry
}

afterEach(() => {
  for (const geometry of tracked) geometry.dispose()
  tracked.length = 0
})

describe('workerGeometry', () => {
  it('faz round-trip das duas peças com seis buffers transferíveis', () => {
    const result: CanHolderBuildResult = {
      body: track(new BoxGeometry(80, 88, 80)),
      handle: track(new BoxGeometry(50, 40, 12)),
    }
    const { data, transfer } = serializeBuildResult(result)
    expect(data.body.position.length).toBeGreaterThan(0)
    expect(data.handle).not.toBeNull()
    expect(transfer).toHaveLength(6)
    expect(new Set(transfer).size).toBe(6)

    const restored = deserializeBuildResult(data)
    track(restored.body)
    track(restored.handle!)

    restored.body.computeBoundingBox()
    expect(restored.body.boundingBox!.max.y).toBeCloseTo(44, 5)
    expect(restored.handle).not.toBeNull()
    expect(restored.handle!.getAttribute('position').count).toBe(
      result.handle!.getAttribute('position').count,
    )
  })

  it('aceita alça nula', () => {
    const body = track(new BoxGeometry(80, 88, 80))
    const { data, transfer } = serializeBuildResult({ body, handle: null })
    expect(data.handle).toBeNull()
    expect(transfer).toHaveLength(3)

    const restored = deserializeBuildResult(data)
    track(restored.body)
    expect(restored.handle).toBeNull()
  })

  it('preserva o índice e amplia Uint16 para Uint32', () => {
    const body = track(new BoxGeometry(80, 88, 80))
    const sourceIndex = body.getIndex()!
    const sourceValues = Array.from(sourceIndex.array)

    expect(sourceIndex.array).toBeInstanceOf(Uint16Array)

    const { data, transfer } = serializeBuildResult({ body, handle: null })
    expect(transfer).toHaveLength(3)
    expect(data.body.index).toBeInstanceOf(Uint32Array)
    expect(data.body.index!.length).toBe(sourceValues.length)
    expect(Array.from(data.body.index!)).toEqual(sourceValues)

    const restored = deserializeBuildResult(data)
    track(restored.body)
    const restoredIndex = restored.body.getIndex()!
    expect(restoredIndex.count).toBe(sourceValues.length)
    expect(Array.from(restoredIndex.array)).toEqual(sourceValues)
  })

  it('faz round-trip de geometria sem índice', () => {
    const source = track(new BoxGeometry(80, 88, 80))
    const nonIndexed = track(source.toNonIndexed())
    expect(nonIndexed.getIndex()).toBeNull()

    const { data, transfer } = serializeBuildResult({
      body: nonIndexed,
      handle: null,
    })
    expect(data.body.index).toBeNull()
    expect(transfer).toHaveLength(2)

    const restored = deserializeBuildResult(data)
    track(restored.body)
    expect(restored.body.getIndex()).toBeNull()
    expect(restored.body.getAttribute('position').count).toBe(
      nonIndexed.getAttribute('position').count,
    )
  })

  it('recalcula as normais quando a geometria serializada não as tem', () => {
    const geometry = track(new BufferGeometry())
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
    )

    const { data } = serializeBuildResult({ body: geometry, handle: null })
    expect(data.body.normal.length).toBe(0)

    const restored = deserializeBuildResult(data)
    track(restored.body)
    const normal = restored.body.getAttribute('normal')
    expect(normal).toBeDefined()
    expect(normal.count).toBe(3)
    expect(normal.getZ(0)).toBeCloseTo(1, 5)
  })

  it('sobrevive ao structuredClone com os buffers transferidos', () => {
    const body = track(new BoxGeometry(80, 88, 80))
    const handle = track(new BoxGeometry(50, 40, 12))
    const { data, transfer } = serializeBuildResult({ body, handle })

    const cloned = structuredClone(
      { body: data.body, handle: data.handle },
      { transfer },
    )
    expect(cloned.body.position.length).toBeGreaterThan(0)
    expect(cloned.handle).not.toBeNull()

    const restored = deserializeBuildResult(cloned)
    track(restored.body)
    track(restored.handle!)
    expect(restored.body.getAttribute('position').count).toBe(
      body.getAttribute('position').count,
    )
    expect(restored.handle!.getAttribute('position').count).toBe(
      handle.getAttribute('position').count,
    )
  })

  it('não compartilha arrays com a geometria de origem', () => {
    const result: CanHolderBuildResult = {
      body: track(new BoxGeometry(80, 88, 80)),
      handle: track(new BoxGeometry(50, 40, 12)),
    }
    const bodyPosition = result.body.getAttribute('position').array as Float32Array
    const handlePosition = result.handle!.getAttribute('position').array as Float32Array
    const bodyValues = Array.from(bodyPosition)
    const handleValues = Array.from(handlePosition)
    const bodyByteLength = bodyPosition.byteLength
    const handleByteLength = handlePosition.byteLength

    const { data } = serializeBuildResult(result)

    expect(Array.from(bodyPosition)).toEqual(bodyValues)
    expect(Array.from(handlePosition)).toEqual(handleValues)
    expect(bodyPosition.byteLength).toBe(bodyByteLength)
    expect(handlePosition.byteLength).toBe(handleByteLength)
    expect(data.body.position.buffer).not.toBe(bodyPosition.buffer)
    expect(data.handle!.position.buffer).not.toBe(handlePosition.buffer)

    data.body.position[0] += 1
    data.handle!.position[0] += 1
    expect(bodyPosition[0]).toBe(bodyValues[0])
    expect(handlePosition[0]).toBe(handleValues[0])
  })

  it('descarta o corpo se a alça falhar ao desserializar', () => {
    const disposeSpy = vi.spyOn(BufferGeometry.prototype, 'dispose')
    const { data } = serializeBuildResult({
      body: track(new BoxGeometry(80, 88, 80)),
      handle: null,
    })
    const malformed = {
      body: data.body,
      handle: {
        position: null as unknown as Float32Array,
        normal: new Float32Array(0),
        index: null,
      },
    }

    expect(() => deserializeBuildResult(malformed)).toThrow()
    expect(disposeSpy).toHaveBeenCalledTimes(1)
    disposeSpy.mockRestore()
  })
})
