import { describe, it, expect } from 'vitest'
import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from 'three'
import {
  deserializeGeometry,
  deserializeThermoformerResult,
  serializeGeometry,
  serializeThermoformerResult,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'
import { buildScreen } from '@/features/studio/tools/lembrancinhas/termoformador/buildScreen'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { buildThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/buildThermoformer'
import type { BuildThermoformerResult } from '@/features/studio/tools/lembrancinhas/termoformador/buildThermoformer'
import { getSupportDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/buildSupport'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('workerGeometry', () => {
  it('faz round-trip de position, normal e index', () => {
    const geometry = new BoxGeometry(10, 2, 6)
    const { data, transfer } = serializeGeometry(geometry)

    expect(data.position.length).toBeGreaterThan(0)
    expect(data.normal.length).toBe(data.position.length)
    expect(data.index).not.toBeNull()
    expect(transfer.length).toBeGreaterThanOrEqual(2)

    const restored = deserializeGeometry(data)
    restored.computeBoundingBox()
    expect(restored.boundingBox!.min.x).toBeCloseTo(-5, 5)
    expect(restored.boundingBox!.max.z).toBeCloseTo(3, 5)
    expect(restored.getAttribute('position').count).toBe(
      geometry.getAttribute('position').count,
    )

    geometry.dispose()
    restored.dispose()
  })

  it('faz round-trip de geometria sem índice (caminho do buildScreen)', () => {
    const geometry = buildScreen(
      defaultThermoformerParams,
      getShapeOutline(defaultThermoformerParams)!,
    )
    const { data, transfer } = serializeGeometry(geometry)

    expect(data.index).toBeNull()
    expect(transfer).toHaveLength(2)

    const restored = deserializeGeometry(data)
    expect(restored.getIndex()).toBeNull()
    expect(restored.getAttribute('position').count).toBe(
      geometry.getAttribute('position').count,
    )

    geometry.dispose()
    restored.dispose()
  })

  it('lida com geometria sem atributo normal', () => {
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
    )

    const { data } = serializeGeometry(geometry)
    expect(data.normal.length).toBe(0)

    const restored = deserializeGeometry(data)
    expect(restored.getAttribute('normal')).toBeUndefined()
    expect(restored.getAttribute('position').count).toBe(3)

    geometry.dispose()
    restored.dispose()
  })

  it('faz round-trip das três peças e do assento', () => {
    const result: BuildThermoformerResult = {
      screen: new BoxGeometry(160, 3, 160),
      support: new BoxGeometry(168.6, 27, 168.6),
      plug: new BoxGeometry(160, 46, 160),
      seatY: 24,
    }
    const { data, transfer } = serializeThermoformerResult(result)

    expect(transfer.length).toBeGreaterThanOrEqual(6)
    expect(data.seatY).toBe(24)

    const restored = deserializeThermoformerResult(data)
    restored.screen.computeBoundingBox()
    restored.support.computeBoundingBox()
    restored.plug.computeBoundingBox()
    expect(restored.screen.boundingBox!.max.x).toBeCloseTo(80, 5)
    expect(restored.support.boundingBox!.max.y).toBeCloseTo(13.5, 5)
    expect(restored.plug.boundingBox!.max.y).toBeCloseTo(23, 5)
    expect(restored.seatY).toBe(24)

    result.screen.dispose()
    result.support.dispose()
    result.plug.dispose()
    restored.screen.dispose()
    restored.support.dispose()
    restored.plug.dispose()
  })

  it('serializa o conjunto real com buffers copiados e sem duplicatas', () => {
    const result = buildThermoformer(defaultThermoformerParams)
    const sourcePosition = result.screen.getAttribute('position').array
    const { data, transfer } = serializeThermoformerResult(result)

    expect(data.screen.index).toBeNull()
    expect(data.support.index).not.toBeNull()
    expect(data.plug.index).not.toBeNull()
    expect(transfer).toHaveLength(8)
    expect(new Set(transfer).size).toBe(transfer.length)
    expect(data.screen.position.buffer).not.toBe(sourcePosition.buffer)
    expect(data.screen.position.buffer).toBe(transfer[0])
    expect(data.seatY).toBeCloseTo(
      getSupportDimensions(defaultThermoformerParams).seatY,
      5,
    )

    result.screen.dispose()
    result.support.dispose()
    result.plug.dispose()
  })
})
