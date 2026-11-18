import { Vector3, type BufferGeometry } from 'three'

function normalize(value: number): number {
  return Math.abs(value) < 5e-5 ? 0 : value
}

function positionKey(x: number, y: number, z: number): string {
  return `${normalize(x).toFixed(4)},${normalize(y).toFixed(4)},${normalize(z).toFixed(4)}`
}

/**
 * Considera fechada quando cada aresta aparece exatamente em 2 triângulos e as
 * arestas direcionadas aparecem uma única vez em cada sentido (winding coerente).
 */
export function isClosed(geometry: BufferGeometry): boolean {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const edges = new Map<string, number>()
  const directed = new Map<string, number>()
  const count = index ? index.count : position.count

  const vertex = (i: number): string => {
    const idx = index ? index.getX(i) : i
    return positionKey(position.getX(idx), position.getY(idx), position.getZ(idx))
  }
  const edge = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

  for (let i = 0; i < count; i += 3) {
    const a = vertex(i)
    const b = vertex(i + 1)
    const c = vertex(i + 2)
    for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
      const key = edge(p, q)
      edges.set(key, (edges.get(key) ?? 0) + 1)
      const direction = `${p}|${q}`
      directed.set(direction, (directed.get(direction) ?? 0) + 1)
    }
  }

  for (const [key, value] of edges) {
    if (value !== 2) return false
    const [a, b] = key.split('|')
    if ((directed.get(`${a}|${b}`) ?? 0) !== 1) return false
    if ((directed.get(`${b}|${a}`) ?? 0) !== 1) return false
  }
  return true
}

/**
 * Conta as cascas conectadas: triângulos que compartilham uma aresta caem no
 * mesmo conjunto (union-find). Uma peça solta ou uma malha partida gera > 1.
 */
export function countShells(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const count = index ? index.count : position.count
  const triangleCount = Math.floor(count / 3)
  const parent = Array.from({ length: triangleCount }, (_, i) => i)

  const find = (triangle: number): number => {
    let root = triangle
    while (parent[root] !== root) root = parent[root]
    let node = triangle
    while (parent[node] !== node) {
      const next = parent[node]
      parent[node] = root
      node = next
    }
    return root
  }

  const union = (a: number, b: number): void => {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA !== rootB) parent[rootB] = rootA
  }

  const vertex = (i: number): string => {
    const idx = index ? index.getX(i) : i
    return positionKey(position.getX(idx), position.getY(idx), position.getZ(idx))
  }
  const edge = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

  const owners = new Map<string, number>()
  for (let t = 0; t < triangleCount; t++) {
    const base = t * 3
    const keys = [vertex(base), vertex(base + 1), vertex(base + 2)]
    const pairs = [
      [keys[0], keys[1]],
      [keys[1], keys[2]],
      [keys[2], keys[0]],
    ] as const

    for (const [p, q] of pairs) {
      const key = edge(p, q)
      const owner = owners.get(key)
      if (owner === undefined) owners.set(key, t)
      else union(owner, t)
    }
  }

  const roots = new Set<number>()
  for (let t = 0; t < triangleCount; t++) roots.add(find(t))
  return roots.size
}

/** Volume orientado pelo teorema da divergência; positivo indica winding para fora. */
export function signedVolume(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const count = index ? index.count : position.count
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const cross = new Vector3()
  let volume = 0

  for (let i = 0; i < count; i += 3) {
    const ia = index ? index.getX(i) : i
    const ib = index ? index.getX(i + 1) : i + 1
    const ic = index ? index.getX(i + 2) : i + 2
    a.fromBufferAttribute(position, ia)
    b.fromBufferAttribute(position, ib)
    c.fromBufferAttribute(position, ic)
    volume += a.dot(cross.crossVectors(b, c)) / 6
  }

  return volume
}
