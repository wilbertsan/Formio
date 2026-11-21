import { describe, it, expect } from 'vitest'
import {
  readBinaryStl,
  unwrapCylinder,
} from '@/features/studio/tools/lembrancinhas/porta-lata/textureImport'

/** Serializa triângulos (9 coordenadas cada) como STL binário. */
function encodeStl(triangles: number[][]): ArrayBuffer {
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
  return encodeStl(triangles)
}

/** Cilindro oco: parede externa modulada e furo de raio 6, sem tampas. */
function hollowCylinder(): ArrayBuffer {
  const segments = 48
  const height = 20
  const boreRadius = 6
  const triangles: number[][] = []
  const outer = (i: number, z: number): [number, number, number] => {
    const theta = (i / segments) * Math.PI * 2
    const radius = 10 + 1.5 * Math.sin(3 * theta) + 0.4 * Math.sin(z / 2)
    return [radius * Math.cos(theta), radius * Math.sin(theta), z]
  }
  const bore = (i: number, z: number): [number, number, number] => {
    const theta = (i / segments) * Math.PI * 2
    return [boreRadius * Math.cos(theta), boreRadius * Math.sin(theta), z]
  }
  for (let i = 0; i < segments; i++) {
    const a = outer(i, 0)
    const b = outer(i + 1, 0)
    const c = outer(i + 1, height)
    const d = outer(i, height)
    triangles.push([...a, ...b, ...c], [...a, ...c, ...d])

    const e = bore(i, 0)
    const f = bore(i + 1, 0)
    const g = bore(i + 1, height)
    const h = bore(i, height)
    triangles.push([...e, ...g, ...f], [...e, ...h, ...g])
  }
  return encodeStl(triangles)
}

/** Cilindro com luva ondulada 12 + 0.2·sin(4θ) nos 3 primeiros mm. */
function flangedCylinder(): ArrayBuffer {
  const segments = 48
  const height = 20
  const flangeHeight = 3
  const triangles: number[][] = []
  const pattern = (i: number, z: number): [number, number, number] => {
    const theta = (i / segments) * Math.PI * 2
    const radius = 10 + 1.5 * Math.sin(3 * theta) + 0.4 * Math.sin(z / 2)
    return [radius * Math.cos(theta), radius * Math.sin(theta), z]
  }
  const sleeve = (i: number, z: number): [number, number, number] => {
    const theta = (i / segments) * Math.PI * 2
    const radius = 12 + 0.2 * Math.sin(4 * theta)
    return [radius * Math.cos(theta), radius * Math.sin(theta), z]
  }
  for (let i = 0; i < segments; i++) {
    const a = sleeve(i, 0)
    const b = sleeve(i + 1, 0)
    const c = sleeve(i + 1, flangeHeight)
    const d = sleeve(i, flangeHeight)
    triangles.push([...a, ...b, ...c], [...a, ...c, ...d])

    const e = pattern(i, flangeHeight)
    const f = pattern(i + 1, flangeHeight)
    const g = pattern(i + 1, height)
    const h = pattern(i, height)
    triangles.push([...e, ...f, ...g], [...e, ...g, ...h])
  }
  return encodeStl(triangles)
}

describe('textureImport', () => {
  it('lê STL binário e desenrola o cilindro', () => {
    const mesh = readBinaryStl(syntheticCylinder())
    expect(mesh.triangleCount).toBeGreaterThan(0)

    const map = unwrapCylinder(mesh, { columns: 48, rows: 24 })
    expect(map.width).toBe(48)
    expect(map.height).toBe(24)
    expect(map.data).toHaveLength(48 * 24)
    expect(map.nativeDepth).toBeGreaterThan(2.3)
    expect(map.nativeDepth).toBeLessThan(5)
    expect(map.maxSlopeDeg).toBeGreaterThan(0)
    expect(new Set(Array.from(map.data)).size).toBeGreaterThan(8)
    expect(Math.max(...map.data) - Math.min(...map.data)).toBeGreaterThan(100)
  })

  it('usa 512 × 256 por padrão', () => {
    const map = unwrapCylinder(readBinaryStl(syntheticCylinder()))
    expect(map.width).toBe(512)
    expect(map.height).toBe(256)
    expect(map.data).toHaveLength(512 * 256)
  })

  it('falha em buffer que não é STL binário', () => {
    expect(() => readBinaryStl(new ArrayBuffer(100))).toThrow()
  })

  it('ignora a parede interna e fecha a emenda em θ', () => {
    const mesh = readBinaryStl(hollowCylinder())
    const map = unwrapCylinder(mesh, { columns: 48, rows: 24 })

    // O furo (raio 6) não entra na profundidade nativa.
    expect(map.nativeDepth).toBeGreaterThan(2.3)
    expect(map.nativeDepth).toBeLessThan(4.5)
    expect(new Set(Array.from(map.data)).size).toBeGreaterThan(8)

    // A coluna 0 é vizinha angular da coluna 1: sem degrau de emenda.
    for (const row of [4, 8, 12, 16, 20]) {
      const seam = Math.abs(map.data[row * map.width] - map.data[row * map.width + 1])
      expect(seam).toBeLessThan(40)
    }
  })

  it('fecha a emenda em θ na resolução de produção', () => {
    const map = unwrapCylinder(readBinaryStl(hollowCylinder()))

    expect(map.width).toBe(512)
    expect(map.height).toBe(256)
    // O furo (raio 6) não entra na profundidade nativa.
    expect(map.nativeDepth).toBeGreaterThan(2.3)
    expect(map.nativeDepth).toBeLessThan(4.5)

    for (const row of [32, 128, 224]) {
      const first = row * map.width
      // A emenda é a coluna 511 contra a 0 da mesma linha. O limite é relativo
      // ao maior degrau entre colunas vizinhas da linha: o padrão pode mudar
      // rápido, mas a volta não pode abrir um furo maior que o próprio relevo.
      let maxAdjacent = 0
      for (let col = 0; col < map.width - 1; col++) {
        maxAdjacent = Math.max(
          maxAdjacent,
          Math.abs(map.data[first + col + 1] - map.data[first + col]),
        )
      }
      expect(maxAdjacent, `linha ${row}`).toBeLessThan(40)
      const wrap = Math.abs(map.data[first + map.width - 1] - map.data[first])
      expect(wrap, `linha ${row}`).toBeLessThanOrEqual(maxAdjacent + 2)
    }
  })

  it('corta o flange ondulado pelo raio mediano', () => {
    const flanged = unwrapCylinder(readBinaryStl(flangedCylinder()), {
      columns: 48,
      rows: 24,
    })
    const plain = unwrapCylinder(readBinaryStl(syntheticCylinder()), {
      columns: 48,
      rows: 24,
    })

    // A luva de 12 ± 0,2 mm não entra na faixa nem infla a profundidade.
    expect(flanged.nativeDepth).toBeGreaterThan(2.3)
    expect(flanged.nativeDepth).toBeLessThan(4.5)
    expect(Math.abs(flanged.nativeDepth - plain.nativeDepth)).toBeLessThan(0.2)

    // A primeira linha é o padrão, não a luva (que fica em ~255).
    const firstRow = flanged.data.slice(0, flanged.width)
    expect(Math.min(...firstRow)).toBeLessThan(200)
  })
})
