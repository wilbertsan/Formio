import { describe, it, expect } from 'vitest'
import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from 'three'
import {
  deserializeGeometry,
  serializeGeometry,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'
import { buildScreen } from '@/features/studio/tools/lembrancinhas/termoformador/buildScreen'
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
    const geometry = buildScreen(defaultThermoformerParams)
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
})
