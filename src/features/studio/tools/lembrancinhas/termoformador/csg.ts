import { BufferAttribute, BufferGeometry, ShapeUtils, Vector2 } from 'three'
import { ADDITION, Brush, SUBTRACTION } from 'three-bvh-csg'
import { createConformingEvaluator } from '../shared/csg'
import { removeDegenerateTriangles } from '../shared/geometryCleanup'

const POSITION_DECIMALS = 4
const ZERO_EPSILON = 5e-5
const ON_EDGE_TOLERANCE = 1e-4
const ENDPOINT_EPSILON = 1e-4
const AREA_EPSILON = 1e-9

interface VertexPoint {
  index: number
  x: number
  y: number
  z: number
}

interface EdgeOwner {
  triangle: number
  fromKey: string
  toKey: string
}

function assertNonEmpty(geometry: BufferGeometry, label: string): void {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const count = index ? index.count : (position?.count ?? 0)
  if (!position || count < 3) {
    throw new Error(`csg: geometria vazia (${label})`)
  }
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Une os vãos em T que o CSG deixa nos caps com arestas colineares.
 *
 * O splitter CDT preserva o cap inteiro de um lado e o divide do outro quando
 * uma aresta reta longa recebe um vértice intermediário (estrelas e SVGs
 * côncavos). A aresta longa fica sem par e a malha não fecha. Aqui os vértices
 * que estão sobre arestas abertas são inseridos no triângulo vizinho, sem criar
 * posições novas e sem emitir triângulos colineares. A chave é a mesma de
 * `removeDegenerateTriangles` e do verificador de manifold (1e-4 mm).
 *
 * Arestas não manifold (mais de dois triângulos) não entram no reparo; o CSG
 * não deve esconder esse defeito.
 */
export function splitTJunctions(geometry: BufferGeometry): void {
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

  const triangleCount = Math.floor(index.count / 3)
  const edgeCounts = new Map<string, number>()
  const edgeOwners = new Map<string, EdgeOwner>()
  const corners = [[0, 1], [1, 2], [2, 0]] as const
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    const base = triangle * 3
    const keys = [
      keyAt(index.getX(base)),
      keyAt(index.getX(base + 1)),
      keyAt(index.getX(base + 2)),
    ]
    for (const [from, to] of corners) {
      const key = edgeKey(keys[from], keys[to])
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1)
      if (!edgeOwners.has(key)) {
        edgeOwners.set(key, {
          triangle,
          fromKey: keys[from],
          toKey: keys[to],
        })
      }
    }
  }

  const candidateKeys = new Set<string>()
  for (const [key, count] of edgeCounts) {
    // Só arestas abertas; arestas com mais de dois triângulos (não manifold)
    // ficam intactas.
    if (count !== 1) continue
    const [a, b] = key.split('|')
    candidateKeys.add(a)
    candidateKeys.add(b)
  }
  if (candidateKeys.size === 0) return

  const candidates: Array<VertexPoint & { key: string }> = []
  for (const key of candidateKeys) {
    const point = points.get(key)
    if (point) candidates.push({ ...point, key })
  }

  const interiorPoints = (
    fromKey: string,
    toKey: string,
    from: VertexPoint,
    to: VertexPoint,
  ): VertexPoint[] => {
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
    return found.map((item) => item.point)
  }

  // Só os triângulos donos de uma aresta aberta longa entram no cálculo.
  const insertions = new Map<number, Map<string, VertexPoint[]>>()
  for (const [key, count] of edgeCounts) {
    if (count !== 1) continue
    const owner = edgeOwners.get(key)
    if (!owner) continue
    const from = points.get(owner.fromKey)
    const to = points.get(owner.toKey)
    if (!from || !to) continue
    const pointsOnEdge = interiorPoints(owner.fromKey, owner.toKey, from, to)
    if (pointsOnEdge.length === 0) continue
    const perTriangle = insertions.get(owner.triangle) ?? new Map()
    perTriangle.set(key, pointsOnEdge)
    insertions.set(owner.triangle, perTriangle)
  }
  if (insertions.size === 0) return

  const areaOf = (a: number, b: number, c: number): number => {
    const ax = position.getX(a)
    const ay = position.getY(a)
    const az = position.getZ(a)
    const ux = position.getX(b) - ax
    const uy = position.getY(b) - ay
    const uz = position.getZ(b) - az
    const vx = position.getX(c) - ax
    const vy = position.getY(c) - ay
    const vz = position.getZ(c) - az
    const cx = uy * vz - uz * vy
    const cy = uz * vx - ux * vz
    const cz = ux * vy - uy * vx
    return 0.5 * Math.hypot(cx, cy, cz)
  }

  const normalOf = (
    a: number,
    b: number,
    c: number,
  ): [number, number, number] => {
    const ax = position.getX(a)
    const ay = position.getY(a)
    const az = position.getZ(a)
    const ux = position.getX(b) - ax
    const uy = position.getY(b) - ay
    const uz = position.getZ(b) - az
    const vx = position.getX(c) - ax
    const vy = position.getY(c) - ay
    const vz = position.getZ(c) - az
    return [
      uy * vz - uz * vy,
      uz * vx - ux * vz,
      ux * vy - uy * vx,
    ]
  }

  const result: number[] = []
  const pushTriangle = (
    a: number,
    b: number,
    c: number,
    faceNormal: [number, number, number],
  ): void => {
    if (areaOf(a, b, c) <= AREA_EPSILON) {
      throw new Error('csg: T-junction gerou triângulo sem área')
    }
    const normal = normalOf(a, b, c)
    const dot =
      normal[0] * faceNormal[0] +
      normal[1] * faceNormal[1] +
      normal[2] * faceNormal[2]
    if (dot < 0) result.push(a, c, b)
    else result.push(a, b, c)
  }

  for (let triangle = 0; triangle < triangleCount; triangle++) {
    const base = triangle * 3
    const indices = [
      index.getX(base),
      index.getX(base + 1),
      index.getX(base + 2),
    ]
    const inserted = insertions.get(triangle)
    if (!inserted) {
      result.push(indices[0], indices[1], indices[2])
      continue
    }

    const keys = indices.map(keyAt)
    const faceNormal = normalOf(indices[0], indices[1], indices[2])

    if (inserted.size === 1) {
      // Uma única aresta subdividida: leque a partir do vértice oposto, sem
      // triângulos colineares na própria aresta.
      const [key, pointsOnEdge] = [...inserted.entries()][0]
      let opposite = -1
      let from = -1
      let to = -1
      for (let corner = 0; corner < 3; corner++) {
        const next = (corner + 1) % 3
        if (edgeKey(keys[corner], keys[next]) === key) {
          opposite = indices[(corner + 2) % 3]
          from = indices[corner]
          to = indices[next]
          break
        }
      }
      if (opposite < 0 || from < 0 || to < 0) {
        throw new Error('csg: aresta aberta sem triângulo dono')
      }
      let previous = from
      for (const point of pointsOnEdge) {
        pushTriangle(opposite, previous, point.index, faceNormal)
        previous = point.index
      }
      pushTriangle(opposite, previous, to, faceNormal)
      continue
    }
    // Pontos em mais de uma aresta: triangula o polígono projetado no eixo
    // dominante da normal do triângulo.
    const boundary: number[] = [indices[0]]
    for (let corner = 0; corner < 3; corner++) {
      const next = (corner + 1) % 3
      const pointsOnEdge = inserted.get(edgeKey(keys[corner], keys[next]))
      if (pointsOnEdge) {
        for (const point of pointsOnEdge) boundary.push(point.index)
      }
      if (next !== 0) boundary.push(indices[next])
    }

    const [nx, ny, nz] = faceNormal
    const absX = Math.abs(nx)
    const absY = Math.abs(ny)
    const absZ = Math.abs(nz)
    const contour = boundary.map((vertex) => {
      const x = position.getX(vertex)
      const y = position.getY(vertex)
      const z = position.getZ(vertex)
      if (absX >= absY && absX >= absZ) return new Vector2(y, z)
      if (absY >= absZ) return new Vector2(x, z)
      return new Vector2(x, y)
    })

    const faces = ShapeUtils.triangulateShape(contour, [])
    if (faces.length === 0) {
      throw new Error('csg: T-junction sem triangulação')
    }
    for (const [a, b, c] of faces) {
      pushTriangle(
        boundary[a],
        boundary[b],
        boundary[c],
        faceNormal,
      )
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
  let raw: BufferGeometry | null = null
  let cleaned: BufferGeometry | null = null
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
      raw = evaluator.evaluate(a, b, operation).geometry
      cleaned = removeDegenerateTriangles(raw)
      raw = null
      splitTJunctions(cleaned)
      current.dispose()
      tool.dispose()
      current = cleaned
      cleaned = null
      tool = null
    }
    current.computeVertexNormals()
    return current
  } catch (error) {
    raw?.dispose()
    cleaned?.dispose()
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
