export interface StlMesh {
  positions: Float32Array
  triangleCount: number
}

/** Lê um STL binário e devolve as posições dos vértices, sem normais. */
export function readBinaryStl(buffer: ArrayBuffer): StlMesh {
  if (buffer.byteLength < 84) throw new Error('STL binário inválido')
  const view = new DataView(buffer)
  const triangleCount = view.getUint32(80, true)
  if (84 + triangleCount * 50 !== buffer.byteLength) {
    throw new Error('STL binário inválido')
  }
  const positions = new Float32Array(triangleCount * 9)
  let offset = 84
  for (let i = 0; i < triangleCount; i++) {
    offset += 12
    for (let v = 0; v < 9; v++) {
      positions[i * 9 + v] = view.getFloat32(offset, true)
      offset += 4
    }
    offset += 2
  }
  return { positions, triangleCount }
}

export interface UnwrapOptions {
  columns?: number
  rows?: number
  wallBandMm?: number
}

export interface UnwrappedTexture {
  width: number
  height: number
  data: Uint8Array
  nativeDepth: number
  maxSlopeDeg: number
}

const TAU = Math.PI * 2

/**
 * Fração do raio máximo abaixo da qual a célula é parede interna ou flange.
 * Fica logo abaixo de 0,80 porque o corte em 0,80 também apagava vales
 * legítimos de texturas profundas (o p1 subia e a profundidade caía).
 * O furo/flange real fica bem abaixo deste corte — verificado nos 14 STLs.
 */
const BORE_RADIUS_RATIO = 0.78

/** Desvio da mediana da linha que separa o padrão de flange, lip ou taper. */
const MEDIAN_END_TOLERANCE_MM = 0.8

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

/**
 * Desenrola a superfície externa de um cilindro em um mapa de altura.
 *
 * A grade guarda o maior raio por célula: a parede externa vence a parede do
 * furo. As pontas com mediana de raio fora do padrão (flange, lip, taper) são
 * cortadas; o mapa final é normalizado em 0..255 e a profundidade nativa vem
 * dos percentis 1 e 99.
 */
export function unwrapCylinder(
  mesh: StlMesh,
  options: UnwrapOptions = {},
): UnwrappedTexture {
  const columns = options.columns ?? 512
  const rows = options.rows ?? 256
  const wallBandMm = options.wallBandMm ?? 99.2
  if (
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    columns < 1 ||
    rows < 2
  ) {
    throw new Error('Dimensões do mapa inválidas')
  }

  // 1. bounds, centro e maior raio
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  const p = mesh.positions
  for (let i = 0; i < p.length; i += 3) {
    if (p[i] < minX) minX = p[i]
    if (p[i] > maxX) maxX = p[i]
    if (p[i + 1] < minY) minY = p[i + 1]
    if (p[i + 1] > maxY) maxY = p[i + 1]
    if (p[i + 2] < minZ) minZ = p[i + 2]
    if (p[i + 2] > maxZ) maxZ = p[i + 2]
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const height = maxZ - minZ
  if (!(height > 0)) throw new Error('STL sem altura')

  let maxR = 0
  for (let i = 0; i < p.length; i += 3) {
    maxR = Math.max(maxR, Math.hypot(p[i] - cx, p[i + 1] - cy))
  }
  if (!(maxR > 0)) throw new Error('STL sem raio')
  const minWallRadius = maxR * BORE_RADIUS_RATIO

  // 2. rasteriza o maior raio em (θ, z) e corta as pontas pelo raio mediano
  const rasterize = (
    z0: number,
    z1: number,
    rowCount: number,
    colCount: number,
  ): Float32Array => {
    const grid = new Float32Array(rowCount * colCount).fill(-1)
    const zSpan = z1 - z0
    for (let t = 0; t < mesh.triangleCount; t++) {
      const base = t * 9
      const xs = [p[base], p[base + 3], p[base + 6]]
      const ys = [p[base + 1], p[base + 4], p[base + 7]]
      const zs = [p[base + 2], p[base + 5], p[base + 8]]
      if (Math.max(...zs) < z0 || Math.min(...zs) > z1) continue
      const r = xs.map((x, k) => Math.hypot(x - cx, ys[k] - cy))
      const theta0 = Math.atan2(ys[0] - cy, xs[0] - cx)
      const angles = xs.map((x, k) => {
        let a = Math.atan2(ys[k] - cy, x - cx)
        while (a - theta0 > Math.PI) a -= TAU
        while (a - theta0 < -Math.PI) a += TAU
        return a
      })
      const minA = Math.min(...angles)
      const maxA = Math.max(...angles)
      const c0 = Math.floor(((minA + Math.PI) / TAU) * colCount) - 1
      const c1 = Math.ceil(((maxA + Math.PI) / TAU) * colCount) + 1
      const r0 = Math.floor(((Math.min(...zs) - z0) / zSpan) * (rowCount - 1)) - 1
      const r1 = Math.ceil(((Math.max(...zs) - z0) / zSpan) * (rowCount - 1)) + 1
      const det =
        (angles[1] - angles[0]) * (zs[2] - zs[0]) -
        (angles[2] - angles[0]) * (zs[1] - zs[0])
      if (Math.abs(det) < 1e-12) continue
      for (let row = Math.max(0, r0); row <= Math.min(rowCount - 1, r1); row++) {
        const zc = z0 + (row / (rowCount - 1)) * zSpan
        // Percorre as colunas em coordenadas desenroladas: ângulos em
        // (π, π+δ] ficam fora de [0, colCount) e não podem ser descartados
        // nem presos ao limite — o índice da grade é o módulo.
        for (let ci = c0; ci <= c1; ci++) {
          const ac = -Math.PI + ((ci + 0.5) / colCount) * TAU
          const w1 =
            ((ac - angles[0]) * (zs[2] - zs[0]) - (angles[2] - angles[0]) * (zc - zs[0])) /
            det
          const w2 =
            ((angles[1] - angles[0]) * (zc - zs[0]) - (ac - angles[0]) * (zs[1] - zs[0])) /
            det
          const w0 = 1 - w1 - w2
          if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue
          const radius = w0 * r[0] + w1 * r[1] + w2 * r[2]
          const col = ((ci % colCount) + colCount) % colCount
          const index = row * colCount + col
          if (radius > grid[index]) grid[index] = radius
        }
      }
    }
    return grid
  }

  const coarseRows = Math.max(32, Math.round(height))
  const coarse = rasterize(minZ, maxZ, coarseRows, columns)
  const rowStep = height / (coarseRows - 1)

  const rowMedian = (row: number): number | null => {
    const values: number[] = []
    for (let col = 0; col < columns; col++) {
      const value = coarse[row * columns + col]
      if (value > minWallRadius) values.push(value)
    }
    return values.length >= columns * 0.5 ? median(values) : null
  }

  const medians: Array<number | null> = []
  for (let row = 0; row < coarseRows; row++) {
    medians.push(rowMedian(row))
  }

  // A mediana interior vem só do miolo (25%..75%) para não herdar as pontas.
  const middleValues: number[] = []
  const middleStart = Math.floor(coarseRows * 0.25)
  const middleEnd = Math.ceil(coarseRows * 0.75)
  for (let row = middleStart; row < middleEnd; row++) {
    const value = medians[row]
    if (value !== null) middleValues.push(value)
  }
  const interior =
    median(middleValues) ??
    median(medians.filter((value): value is number => value !== null))

  // Corta flange/lip/taper nas duas pontas, no máximo metade da altura de cada
  // lado. O padrão varia ~0.6 mm, abaixo da tolerância de 0.8 mm.
  const maxTrim = Math.floor(coarseRows / 2)
  let first = 0
  let last = coarseRows - 1
  if (interior !== null) {
    while (first < maxTrim) {
      const value = medians[first]
      if (value !== null && Math.abs(value - interior) <= MEDIAN_END_TOLERANCE_MM) break
      first += 1
    }
    while (last > coarseRows - 1 - maxTrim) {
      const value = medians[last]
      if (value !== null && Math.abs(value - interior) <= MEDIAN_END_TOLERANCE_MM) break
      last -= 1
    }
  }

  let z0: number
  let z1: number
  if (interior !== null && last - first + 1 >= 2) {
    z0 = minZ + first * rowStep
    z1 = minZ + last * rowStep
  } else {
    const margin = Math.min(1, height / 4)
    z0 = minZ + margin
    z1 = maxZ - margin
  }

  // 3. mapa final, preenchimento dos vazios e normalização
  const grid = rasterize(z0, z1, rows, columns)
  // O corte de furo/flange usa o raio externo da faixa: um flange já cortado
  // não pode inflar o limite e apagar vales do padrão.
  let bandMaxR = 0
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > bandMaxR) bandMaxR = grid[i]
  }
  const minBandRadius = (bandMaxR > 0 ? bandMaxR : maxR) * BORE_RADIUS_RATIO
  // A parede do furo tem raio muito menor que a externa: descartar essas
  // células evita que o p1 caia para o furo e infle a profundidade nativa.
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] >= 0 && grid[i] < minBandRadius) grid[i] = -1
  }
  const fill = (): void => {
    for (let iteration = 0; iteration < 8; iteration++) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const index = row * columns + col
          if (grid[index] >= 0) continue
          let sum = 0
          let count = 0
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const r = row + dr
              const c = (col + dc + columns) % columns
              if (r < 0 || r >= rows) continue
              const value = grid[r * columns + c]
              if (value >= 0) {
                sum += value
                count += 1
              }
            }
          }
          if (count > 0) grid[index] = sum / count
        }
      }
    }
  }
  fill()

  const values = Array.from(grid)
    .filter((value) => value >= 0)
    .sort((a, b) => a - b)
  if (values.length < columns * rows * 0.8) throw new Error('Superfície incompleta')
  const low = values[Math.floor(values.length * 0.01)]
  const high = values[Math.floor(values.length * 0.99)]
  const nativeDepth = high - low
  if (!(nativeDepth > 0.2)) throw new Error('Textura sem relevo')

  const data = new Uint8Array(columns * rows)
  for (let i = 0; i < grid.length; i++) {
    const normalized = Math.min(1, Math.max(0, (grid[i] - low) / nativeDepth))
    data[i] = Math.round(normalized * 255)
  }

  const spacing = wallBandMm / (rows - 1)
  let maxSlope = 0
  for (let row = 1; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const upper = data[row * columns + col] / 255
      const lower = data[(row - 1) * columns + col] / 255
      const slope = (nativeDepth * Math.abs(upper - lower)) / spacing
      if (slope > maxSlope) maxSlope = slope
    }
  }

  return {
    width: columns,
    height: rows,
    data,
    nativeDepth,
    maxSlopeDeg: (Math.atan(maxSlope) * 180) / Math.PI,
  }
}
