import type { Shape } from 'three'
import type { ParsedSvg } from '../shared/svgToIconShape'
import { svgBoundsFromParsed, svgShapesFromParsed } from '../shared/svgToIconShape'
import {
  DENSITY_CELL_MM, EDGE_MARGIN_MM, MIN_FEATURE_MM, MESH_STEP_MM,
  RELIEF_BEVEL_MM, type PatternMotif, type TextureRollerParams,
} from './schema'
import { isStaggered, motifShapes, type MotifShape } from './patterns'

export interface HeightField {
  height: Float32Array
  cols: number
  bodyRows: number
  cellCols: number
  cellRows: number
}

// Normaliza contornos do SVG para a célula [-0.44, 0.44], preservando proporção.
// O SVGLoader entrega Y para baixo; negamos Y para corrigir a orientação.
interface ShapeBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function shapeBounds(shapes: Shape[]): ShapeBounds | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const shape of shapes) {
    for (const poly of [shape.getPoints(), ...shape.holes.map((hole) => hole.getPoints())]) {
      for (const p of poly) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
      }
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null
  return { minX, minY, maxX, maxY }
}

function svgMotifShapes(parsed: ParsedSvg | null): MotifShape[] {
  if (!parsed) return []
  const raw = svgBoundsFromParsed(parsed)
  if (!raw) return []
  const rawSpan = Math.max(raw.width, raw.height)
  if (rawSpan <= 0) return []

  const scaleGuess = 0.88 / rawSpan
  const minFeatureSvg = MIN_FEATURE_MM / scaleGuess
  const shapes = svgShapesFromParsed(parsed, minFeatureSvg)
  if (shapes.length === 0) return []

  const bounds = shapeBounds(shapes)
  if (!bounds) return []
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
  if (span <= 0) return []

  const scale = 0.88 / span
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  return shapes.map((shape) => ({
    outer: shape.getPoints().map((p) => ({ x: (p.x - cx) * scale, y: -(p.y - cy) * scale })),
    holes: shape.holes.map((hole) => hole.getPoints().map((p) => ({ x: (p.x - cx) * scale, y: -(p.y - cy) * scale }))),
  }))
}

interface ScanlineEdge { x0: number; y0: number; x1: number; y1: number }

// Rasteriza um motivo (outer + furos, regra even-odd) na máscara.
// X é periódico (wrap) para fechar a costura do cilindro.
function rasterizeShapes(
  shapes: MotifShape[],
  cols: number,
  bodyRows: number,
  cellW: number,
  cellH: number,
  col: number,
  row: number,
  xOffset: number,
  put: (c: number, r: number) => void,
): void {
  const edges: ScanlineEdge[] = []
  let minY = Infinity
  let maxY = -Infinity
  for (const shape of shapes) {
    for (const poly of [shape.outer, ...shape.holes]) {
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i]
        const b = poly[(i + 1) % poly.length]
        const ax = (col + 0.5 + xOffset + a.x) * cellW
        const bx = (col + 0.5 + xOffset + b.x) * cellW
        const ay = (row + 0.5 + a.y) * cellH
        const by = (row + 0.5 + b.y) * cellH
        edges.push({ x0: ax, y0: ay, x1: bx, y1: by })
        minY = Math.min(minY, ay, by)
        maxY = Math.max(maxY, ay, by)
      }
    }
  }
  if (edges.length === 0) return

  const rStart = Math.max(0, Math.floor(minY))
  const rEnd = Math.min(bodyRows - 1, Math.ceil(maxY))
  for (let r = rStart; r <= rEnd; r++) {
    const yc = r + 0.5
    const xs: number[] = []
    for (const e of edges) {
      if ((e.y0 <= yc) !== (e.y1 <= yc)) {
        xs.push(e.x0 + ((yc - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0))
      }
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const from = Math.ceil(xs[i])
      const to = Math.floor(xs[i + 1])
      for (let c = from; c <= to; c++) {
        const wrapped = ((c % cols) + cols) % cols
        put(wrapped, r)
      }
    }
  }
}

// Chamfer 2-pass com wrap em X: distância até as células cujo valor é `seed`.
function distTo(
  mask: Uint8Array,
  cols: number,
  bodyRows: number,
  dU: number,
  dV: number,
  seed: number,
): Float32Array {
  const INF = 1e9
  const diag = Math.hypot(dU, dV)
  const dist = new Float32Array(cols * bodyRows).fill(INF)
  for (let i = 0; i < mask.length; i++) if (mask[i] === seed) dist[i] = 0

  const neighbors: Array<[number, number, number]> = [
    [-1, 0, dU], [1, 0, dU], [0, -1, dV], [0, 1, dV],
    [-1, -1, diag], [1, -1, diag], [-1, 1, diag], [1, 1, diag],
  ]

  const pass = (rStart: number, rEnd: number, step: number) => {
    for (let r = rStart; r !== rEnd; r += step) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        let best = dist[i]
        for (const [dc, dr, w] of neighbors) {
          const rr = r + dr
          if (rr < 0 || rr >= bodyRows) continue
          const cc = (c + dc + cols) % cols
          const candidate = dist[rr * cols + cc] + w
          if (candidate < best) best = candidate
        }
        dist[i] = best
      }
    }
  }
  pass(0, bodyRows, 1)
  pass(bodyRows - 1, -1, -1)
  return dist
}

function applyBevel(
  mask: Uint8Array,
  cols: number,
  bodyRows: number,
  dU: number,
  dV: number,
  depth: number,
): Float32Array {
  const outside = distTo(mask, cols, bodyRows, dU, dV, 0)
  const inside = distTo(mask, cols, bodyRows, dU, dV, 1)
  const half = Math.min(dU, dV) / 2
  const height = new Float32Array(cols * bodyRows)
  for (let i = 0; i < mask.length; i++) {
    const signed = mask[i] ? outside[i] - half : -(inside[i] - half)
    const t = (signed + RELIEF_BEVEL_MM) / (2 * RELIEF_BEVEL_MM)
    height[i] = depth * Math.min(1, Math.max(0, t))
  }
  return height
}

export function buildHeightField(
  params: TextureRollerParams,
  parsedSvg: ParsedSvg | null = null,
): HeightField {
  const circumference = Math.PI * params.diameter
  const cellMm = DENSITY_CELL_MM[params.density]
  const cellCols = Math.max(3, Math.round(circumference / cellMm))
  const cellRows = Math.max(2, Math.round(params.length / cellMm))
  const cols = Math.max(cellCols, Math.round(circumference / MESH_STEP_MM))
  const bodyRows = Math.max(cellRows, Math.round(params.length / MESH_STEP_MM))

  const cellW = cols / cellCols
  const cellH = bodyRows / cellRows

  let shapes: MotifShape[]
  let staggered = false
  if (params.patternSource === 'svg') {
    shapes = svgMotifShapes(parsedSvg)
  } else {
    shapes = motifShapes(params.patternFamily, params.patternMotif as PatternMotif)
    staggered = isStaggered(params.patternMotif as PatternMotif)
  }

  const mask = new Uint8Array(cols * bodyRows)
  if (shapes.length > 0) {
    for (let row = 0; row < cellRows; row++) {
      for (let col = 0; col < cellCols; col++) {
        const xOffset = staggered && row % 2 === 1 ? 0.5 : 0
        rasterizeShapes(
          shapes, cols, bodyRows, cellW, cellH, col, row, xOffset,
          (c, r) => { mask[r * cols + c] = 1 },
        )
      }
    }
  }

  const marginRows = Math.max(1, Math.ceil(EDGE_MARGIN_MM / (params.length / bodyRows)))
  for (let r = 0; r < marginRows; r++) {
    for (let c = 0; c < cols; c++) {
      mask[r * cols + c] = 0
      mask[(bodyRows - 1 - r) * cols + c] = 0
    }
  }

  const height = applyBevel(mask, cols, bodyRows, circumference / cols, params.length / bodyRows, params.reliefDepth)
  for (let r = 0; r < marginRows; r++) {
    for (let c = 0; c < cols; c++) {
      height[r * cols + c] = 0
      height[(bodyRows - 1 - r) * cols + c] = 0
    }
  }
  return { height, cols, bodyRows, cellCols, cellRows }
}
