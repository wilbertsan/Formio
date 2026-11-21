import { Vector3, type BufferGeometry } from 'three'

function normalize(value: number): number {
  return Math.abs(value) < 5e-5 ? 0 : value
}

function positionKey(x: number, y: number, z: number): string {
  return `${normalize(x).toFixed(4)},${normalize(y).toFixed(4)},${normalize(z).toFixed(4)}`
}

interface CanonicalPositions {
  /** Id canônico (por posição) de cada vértice da attribute `position`. */
  ids: Int32Array
  /** Número de posições únicas. */
  count: number
}

const canonicalCache = new WeakMap<BufferGeometry, CanonicalPositions>()

/**
 * Canoniza as posições uma única vez por geometria: vértices com a mesma
 * `positionKey` recebem o mesmo id numérico. As verificações de malha trocam as
 * chaves de aresta em string por índices numéricos, que são muito mais baratos
 * em malhas de centenas de milhares de triângulos.
 */
function canonicalPositions(geometry: BufferGeometry): CanonicalPositions {
  const cached = canonicalCache.get(geometry)
  if (cached) return cached

  const position = geometry.getAttribute('position')
  const ids = new Int32Array(position.count)
  const lookup = new Map<string, number>()
  let count = 0

  for (let i = 0; i < position.count; i++) {
    const key = positionKey(position.getX(i), position.getY(i), position.getZ(i))
    let id = lookup.get(key)
    if (id === undefined) {
      id = count
      count += 1
      lookup.set(key, id)
    }
    ids[i] = id
  }

  const canonical = { ids, count }
  canonicalCache.set(geometry, canonical)
  return canonical
}

/**
 * Considera fechada quando cada aresta aparece exatamente em 2 triângulos e as
 * arestas direcionadas aparecem uma única vez em cada sentido (winding coerente).
 */
export function isClosed(geometry: BufferGeometry): boolean {
  const index = geometry.getIndex()
  const { ids, count: positionCount } = canonicalPositions(geometry)
  const count = index ? index.count : ids.length
  // Bits 0–1 guardam as direções vistas (a→b e b→a); os bits acima, quantas
  // vezes a aresta apareceu. Fechamento exige 2 ocorrências e as duas direções.
  const edges = new Map<number, number>()

  const vertex = (i: number): number => ids[index ? index.getX(i) : i]
  const addEdge = (p: number, q: number): void => {
    const low = p < q ? p : q
    const high = p < q ? q : p
    const edge = low * positionCount + high
    const direction = p === low ? 1 : 2
    const value = edges.get(edge) ?? 0
    edges.set(edge, ((value >> 2) + 1) * 4 + ((value & 3) | direction))
  }

  for (let i = 0; i < count; i += 3) {
    const a = vertex(i)
    const b = vertex(i + 1)
    const c = vertex(i + 2)
    addEdge(a, b)
    addEdge(b, c)
    addEdge(c, a)
  }

  for (const value of edges.values()) {
    if ((value >> 2) !== 2 || (value & 3) !== 3) return false
  }
  return true
}

/**
 * Conta as cascas conectadas: triângulos que compartilham uma aresta caem no
 * mesmo conjunto (union-find). Uma peça solta ou uma malha partida gera > 1.
 */
export function countShells(geometry: BufferGeometry): number {
  const index = geometry.getIndex()
  const { ids, count: positionCount } = canonicalPositions(geometry)
  const count = index ? index.count : ids.length
  const triangleCount = Math.floor(count / 3)
  const parent = new Int32Array(triangleCount)
  for (let i = 0; i < triangleCount; i++) parent[i] = i

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

  const vertex = (i: number): number => ids[index ? index.getX(i) : i]
  const owners = new Map<number, number>()
  const link = (p: number, q: number, triangle: number): void => {
    const key = p < q ? p * positionCount + q : q * positionCount + p
    const owner = owners.get(key)
    if (owner === undefined) owners.set(key, triangle)
    else union(owner, triangle)
  }

  for (let t = 0; t < triangleCount; t++) {
    const base = t * 3
    const a = vertex(base)
    const b = vertex(base + 1)
    const c = vertex(base + 2)
    link(a, b, t)
    link(b, c, t)
    link(c, a, t)
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
