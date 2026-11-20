import { BufferAttribute, BufferGeometry } from 'three'
import { ADDITION, Brush, SUBTRACTION } from 'three-bvh-csg'
import { createConformingEvaluator } from '../shared/csg'
import { removeDegenerateTriangles } from '../shared/geometryCleanup'

const POSITION_DECIMALS = 4
const ZERO_EPSILON = 5e-5
const ON_EDGE_TOLERANCE = 1e-4
const ENDPOINT_EPSILON = 1e-4

interface VertexPoint {
  index: number
  x: number
  y: number
  z: number
}

function assertNonEmpty(geometry: BufferGeometry, label: string): void {
  const position = geometry.getAttribute('position')
  if (!position || position.count === 0) {
    throw new Error(`csg: geometria vazia (${label})`)
  }
}

/**
 * Une os vãos em T que o CSG deixa nos caps com arestas colineares.
 *
 * O splitter CDT preserva o cap inteiro de um lado e o divide do outro quando
 * uma aresta reta longa recebe um vértice intermediário (estrelas e SVGs
 * côncavos). A aresta longa fica sem par e a malha não fecha. Aqui os vértices
 * que estão sobre arestas abertas são inseridos no triângulo vizinho por um
 * leque, sem criar posições novas. A chave é a mesma de
 * `removeDegenerateTriangles` e do verificador de manifold (1e-4 mm).
 */
function splitTJunctions(geometry: BufferGeometry): void {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  if (!index) return

  const keyCache = new Map<number, string>()
  const points = new Map<string, VertexPoint>()
  const keyAt = (vertex: number): string => {
    const cached = keyCache.get(vertex)
    if (cached !== undefined) return cached
    const normalize = (value: number): number =>
      Math.abs(value) < ZERO_EPSILON ? 0 : value
    const x = position.getX(vertex)
    const y = position.getY(vertex)
    const z = position.getZ(vertex)
    const key = `${normalize(x).toFixed(POSITION_DECIMALS)},${normalize(y).toFixed(POSITION_DECIMALS)},${normalize(z).toFixed(POSITION_DECIMALS)}`
    keyCache.set(vertex, key)
    if (!points.has(key)) points.set(key, { index: vertex, x, y, z })
    return key
  }

  const edgeCounts = new Map<string, number>()
  const edges = [[0, 1], [1, 2], [2, 0]] as const
  for (let i = 0; i < index.count; i += 3) {
    const keys = [
      keyAt(index.getX(i)),
      keyAt(index.getX(i + 1)),
      keyAt(index.getX(i + 2)),
    ]
    for (const [from, to] of edges) {
      const a = keys[from]
      const b = keys[to]
      const key = a < b ? `${a}|${b}` : `${b}|${a}`
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1)
    }
  }

  const candidateKeys = new Set<string>()
  for (const [edge, count] of edgeCounts) {
    if (count === 2) continue
    const [a, b] = edge.split('|')
    candidateKeys.add(a)
    candidateKeys.add(b)
  }
  if (candidateKeys.size === 0) return

  const candidates: Array<VertexPoint & { key: string }> = []
  for (const key of candidateKeys) {
    const point = points.get(key)
    if (point) candidates.push({ ...point, key })
  }

  const interior = (
    fromKey: string,
    toKey: string,
    from: VertexPoint,
    to: VertexPoint,
  ): Array<{ point: VertexPoint; t: number }> => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dz = to.z - from.z
    const lengthSq = dx * dx + dy * dy + dz * dz
    if (lengthSq <= 0) return []
    const found: Array<{ point: VertexPoint; t: number }> = []
    for (const candidate of candidates) {
      if (candidate.key === fromKey || candidate.key === toKey) continue
      const t =
        ((candidate.x - from.x) * dx +
          (candidate.y - from.y) * dy +
          (candidate.z - from.z) * dz) /
        lengthSq
      if (t <= ENDPOINT_EPSILON || t >= 1 - ENDPOINT_EPSILON) continue
      const px = from.x + t * dx
      const py = from.y + t * dy
      const pz = from.z + t * dz
      const distanceSq =
        (candidate.x - px) ** 2 +
        (candidate.y - py) ** 2 +
        (candidate.z - pz) ** 2
      if (distanceSq > ON_EDGE_TOLERANCE ** 2) continue
      found.push({ point: candidate, t })
    }
    found.sort((a, b) => a.t - b.t)
    return found
  }

  const result: number[] = []
  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i)
    const ib = index.getX(i + 1)
    const ic = index.getX(i + 2)
    const ka = keyAt(ia)
    const kb = keyAt(ib)
    const kc = keyAt(ic)
    const boundary: number[] = [ia]
    const corners = [ia, ib, ic]
    const cornerKeys = [ka, kb, kc]
    for (let corner = 0; corner < 3; corner++) {
      const next = (corner + 1) % 3
      const from = points.get(cornerKeys[corner])!
      const to = points.get(cornerKeys[next])!
      for (const { point } of interior(
        cornerKeys[corner],
        cornerKeys[next],
        from,
        to,
      )) {
        boundary.push(point.index)
      }
      if (next !== 0) boundary.push(corners[next])
    }
    if (boundary.length === 3) {
      result.push(boundary[0], boundary[1], boundary[2])
      continue
    }
    for (let k = 1; k < boundary.length - 1; k++) {
      result.push(boundary[0], boundary[k], boundary[k + 1])
    }
  }

  const IndexArray = index.array.constructor as new (
    values: number[],
  ) => Uint16Array | Uint32Array
  geometry.setIndex(new BufferAttribute(new IndexArray(result), 1))
}

/**
 * Aplica a operação entre `base` e as `tools`.
 *
 * Posse: com ao menos uma ferramenta, consome e descarta `base` e `tools` e
 * devolve uma geometria nova. Com `tools` vazio devolve `base` sem consumir;
 * o chamador continua dono.
 */
export function csg(
  base: BufferGeometry,
  tools: BufferGeometry[],
  operation = SUBTRACTION,
): BufferGeometry {
  if (tools.length === 0) return base
  const pending = [...tools]
  let current = base
  let tool: BufferGeometry | null = null
  try {
    const evaluator = createConformingEvaluator()
    // `loftOutline` não gera UV e as peças são de material único; sem restringir
    // os atributos, o CSG falha ao exigir UV em todas as geometrias.
    evaluator.attributes = ['position', 'normal']
    while (pending.length > 0) {
      tool = pending.shift()!
      assertNonEmpty(current, 'base')
      assertNonEmpty(tool, 'ferramenta')
      const a = new Brush(current)
      const b = new Brush(tool)
      a.updateMatrixWorld()
      b.updateMatrixWorld()
      const result = evaluator.evaluate(a, b, operation).geometry
      const cleaned = removeDegenerateTriangles(result)
      splitTJunctions(cleaned)
      current.dispose()
      tool.dispose()
      current = cleaned
      tool = null
    }
    current.computeVertexNormals()
    return current
  } catch (error) {
    current.dispose()
    tool?.dispose()
    for (const pendingTool of pending) pendingTool.dispose()
    throw error
  }
}

/**
 * Une as peças em sequência. Com uma peça devolve a própria geometria sem
 * consumir; com nenhuma, uma geometria vazia nova.
 */
export function unionParts(parts: BufferGeometry[]): BufferGeometry {
  if (parts.length === 0) return new BufferGeometry()
  const [first, ...rest] = parts
  return csg(first, rest, ADDITION)
}
