import { describe, it, expect } from 'vitest'
import {
  readBinaryStl,
  unwrapCylinder,
} from '@/features/studio/tools/lembrancinhas/porta-lata/textureImport'

/** Cilindro de raio 10 + 1.5·sin(3θ) + 0.4·sin(z/2), altura 20, com tampas. */
function syntheticCylinder(): ArrayBuffer {
  const segments = 48
  const height = 20
  const triangles: number[][] = []
  const point = (i: number, z: number): [number, number, number] => {
    const theta = (i / segments) * Math.PI * 2
    const radius = 10 + 1.5 * Math.sin(3 * theta) + 0.4 * Math.sin(z / 2)
    return [radius * Math.cos(theta), radius * Math.sin(theta), z]
  }
  for (let i = 0; i < segments; i++) {
    const a = point(i, 0)
    const b = point(i + 1, 0)
    const c = point(i + 1, height)
    const d = point(i, height)
    triangles.push([...a, ...b, ...c], [...a, ...c, ...d])
  }
  for (let i = 0; i < segments; i++) {
    const a = point(i, 0)
    const b = point(i + 1, 0)
    triangles.push([0, 0, 0, ...a, ...b])
    const c = point(i, height)
    const d = point(i + 1, height)
    triangles.push([0, 0, height, ...c, ...d])
  }
  const buffer = new ArrayBuffer(84 + triangles.length * 50)
  const view = new DataView(buffer)
  view.setUint32(80, triangles.length, true)
  let offset = 84
  for (const triangle of triangles) {
    for (let i = 0; i < 12; i++) {
      view.setFloat32(offset + i * 4, i < 3 ? 0 : triangle[i - 3], true)
    }
    offset += 50
  }
  return buffer
}

describe('textureImport', () => {
  it('lê STL binário e desenrola o cilindro', () => {
    const mesh = readBinaryStl(syntheticCylinder())
    expect(mesh.triangleCount).toBeGreaterThan(0)

    const map = unwrapCylinder(mesh, { columns: 48, rows: 24 })
    expect(map.width).toBe(48)
    expect(map.height).toBe(24)
    expect(map.data).toHaveLength(48 * 24)
    expect(map.nativeDepth).toBeGreaterThan(2.5)
    expect(map.nativeDepth).toBeLessThan(5)
    expect(map.maxSlopeDeg).toBeGreaterThan(0)
    expect(new Set(Array.from(map.data)).size).toBeGreaterThan(8)
    expect(Math.max(...map.data) - Math.min(...map.data)).toBeGreaterThan(100)
  })

  it('falha em buffer que não é STL binário', () => {
    expect(() => readBinaryStl(new ArrayBuffer(100))).toThrow()
  })
})
