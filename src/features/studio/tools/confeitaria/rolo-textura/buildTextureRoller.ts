import { BufferAttribute, BufferGeometry } from 'three'
import type { ParsedSvg, Point2 } from '../shared/svgToIconShape'
import { svgBoundsFromParsed, svgShapesFromParsed } from '../shared/svgToIconShape'
import { pathsToShapes, toClipperPaths, unionPaths } from '../shared/textOutline'
import {
  DENSITY_CELL_MM, EDGE_MARGIN_MM, HANDLE_DIAMETER_MM, HANDLE_FILLET_MM,
  HANDLE_LENGTH_MM, MIN_FEATURE_MM, MESH_STEP_MM,
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

// Normaliza o SVG em unidades de célula antes de dilatar, garantindo que a
// espessura mínima física não infle o motivo. O SVGLoader entrega Y para baixo;
// negamos Y no resultado final.
function svgMotifShapes(parsed: ParsedSvg | null, minFeatureFrac: number): MotifShape[] {
  if (!parsed) return []
  const raw = svgBoundsFromParsed(parsed)
  if (!raw) return []
  const rawSpan = Math.max(raw.width, raw.height)
  if (rawSpan <= 0) return []

  const baseSpan = Math.max(0.2, 0.88 - minFeatureFrac)
  const scale = baseSpan / rawSpan
  const mapPoint = (p: Point2): Point2 => ({
    x: (p.x - raw.centerX) * scale,
    y: (p.y - raw.centerY) * scale,
  })

  const scaled: ParsedSvg = {
    fills: parsed.fills.map((fill) => ({
      outer: fill.outer.map(mapPoint),
      holes: fill.holes.map((hole) => hole.map(mapPoint)),
    })),
    strokes: parsed.strokes.map((stroke) => ({
      points: stroke.points.map(mapPoint),
      width: stroke.width * scale,
    })),
  }

  const rawShapes = svgShapesFromParsed(scaled, minFeatureFrac)
  if (rawShapes.length === 0) return []
  const merged = pathsToShapes(unionPaths(toClipperPaths(rawShapes)))

  return merged.map((shape) => ({
    outer: shape.getPoints().map((p) => ({ x: p.x, y: -p.y })),
    holes: shape.holes.map((hole) => hole.getPoints().map((p) => ({ x: p.x, y: -p.y }))),
  }))
}

interface ScanlineEdge { x0: number; y0: number; x1: number; y1: number }

// Rasteriza uma cell row inteira num buffer local de largura `cellW`.
// O motivo é replicado por blit inteiro, o que garante periodicidade exata.
function buildCellRowMask(
  shapes: MotifShape[],
  cellW: number,
  cellH: number,
  bodyRows: number,
  row: number,
  xOffset: number,
): Uint8Array {
  const local = new Uint8Array(cellW * bodyRows)
  const edges: ScanlineEdge[] = []
  let minY = Infinity
  let maxY = -Infinity
  for (const shape of shapes) {
    for (const poly of [shape.outer, ...shape.holes]) {
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i]
        const b = poly[(i + 1) % poly.length]
        const ax = (0.5 + xOffset + a.x) * cellW
        const bx = (0.5 + xOffset + b.x) * cellW
        const ay = (row + 0.5 + a.y) * cellH
        const by = (row + 0.5 + b.y) * cellH
        edges.push({ x0: ax, y0: ay, x1: bx, y1: by })
        minY = Math.min(minY, ay, by)
        maxY = Math.max(maxY, ay, by)
      }
    }
  }
  if (edges.length === 0) return local

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
      const from = Math.ceil(xs[i] - 1e-9)
      const to = Math.floor(xs[i + 1] + 1e-9)
      for (let c = from; c <= to; c++) {
        const lc = ((c % cellW) + cellW) % cellW
        local[r * cellW + lc] = 1
      }
    }
  }
  return local
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
  const minCols = Math.round(circumference / MESH_STEP_MM)
  const cols = Math.max(cellCols, Math.ceil(minCols / cellCols) * cellCols)
  const minRows = Math.round(params.length / MESH_STEP_MM)
  const bodyRows = Math.max(cellRows, Math.ceil(minRows / cellRows) * cellRows)

  const cellW = cols / cellCols
  const cellH = bodyRows / cellRows
  const cellWidthMm = circumference / cellCols
  const cellHeightMm = params.length / cellRows
  const cellMmReal = Math.min(cellWidthMm, cellHeightMm)
  const minFeatureMm = Math.max(MIN_FEATURE_MM, 2 * MESH_STEP_MM)
  const minFeatureFrac = minFeatureMm / cellMmReal

  let shapes: MotifShape[]
  let staggered = false
  if (params.patternSource === 'svg') {
    shapes = svgMotifShapes(parsedSvg, minFeatureFrac)
  } else {
    shapes = motifShapes(params.patternFamily, params.patternMotif as PatternMotif)
    staggered = isStaggered(params.patternMotif as PatternMotif)
  }

  const mask = new Uint8Array(cols * bodyRows)
  if (shapes.length > 0) {
    for (let row = 0; row < cellRows; row++) {
      const xOffset = staggered && row % 2 === 1 ? 0.5 : 0
      const local = buildCellRowMask(shapes, cellW, cellH, bodyRows, row, xOffset)
      for (let col = 0; col < cellCols; col++) {
        const shift = col * cellW
        for (let r = 0; r < bodyRows; r++) {
          for (let c = 0; c < cellW; c++) {
            if (local[r * cellW + c]) mask[r * cols + ((shift + c) % cols)] = 1
          }
        }
      }
    }
  }

  const marginRows = Math.max(1, Math.ceil(EDGE_MARGIN_MM / (params.length / bodyRows)))
  const bevelRows = Math.ceil(RELIEF_BEVEL_MM / (params.length / bodyRows))
  const maskedRows = marginRows + bevelRows
  for (let r = 0; r < maskedRows; r++) {
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

const AXLE_RADIUS = HANDLE_DIAMETER_MM / 2

interface ProfileSample { x: number; radius: number; body: boolean; row: number }

// Anel i do corpo (x = -L/2 + i*passo) amostra a linha i do campo (centro da célula).
export function bodyRowForRing(i: number, bodyRows: number): number {
  return Math.min(bodyRows - 1, i)
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

// Perfil de revolução: corpo + filetes côncavos + eixos + pontas hemisféricas.
function buildProfile(params: TextureRollerParams, bodyRows: number): ProfileSample[] {
  const half = params.length / 2
  const bodyRadius = params.diameter / 2
  const samples: ProfileSample[] = []

  for (let i = 0; i <= bodyRows; i++) {
    samples.push({
      x: -half + (params.length * i) / bodyRows,
      radius: bodyRadius,
      body: true,
      row: bodyRowForRing(i, bodyRows),
    })
  }

  const filletSteps = Math.max(2, Math.ceil(HANDLE_FILLET_MM / MESH_STEP_MM))
  const tipSteps = Math.max(2, Math.ceil(AXLE_RADIUS / MESH_STEP_MM))
  const axleStart = HANDLE_FILLET_MM
  const axleEnd = HANDLE_LENGTH_MM - AXLE_RADIUS
  const axleSteps = Math.max(1, Math.ceil((axleEnd - axleStart) / 1))

  for (const sign of [-1, 1]) {
    for (let i = 1; i <= filletSteps; i++) {
      const t = i / filletSteps
      samples.push({
        x: sign * (half + HANDLE_FILLET_MM * t),
        radius: AXLE_RADIUS + (bodyRadius - AXLE_RADIUS) * (1 - smoothstep(t)),
        body: false,
        row: 0,
      })
    }
    for (let i = 1; i <= axleSteps; i++) {
      samples.push({
        x: sign * (half + axleStart + ((axleEnd - axleStart) * i) / axleSteps),
        radius: AXLE_RADIUS,
        body: false,
        row: 0,
      })
    }
    for (let i = 1; i <= tipSteps; i++) {
      const t = i / tipSteps
      samples.push({
        x: sign * (half + axleEnd + AXLE_RADIUS * t),
        radius: AXLE_RADIUS * Math.sqrt(Math.max(0, 1 - t * t)),
        body: false,
        row: 0,
      })
    }
  }

  return samples.sort((a, b) => a.x - b.x)
}

export interface BuildTextureRollerInput {
  params: TextureRollerParams
  parsedSvg?: ParsedSvg | null
}

export interface BuildTextureRollerResult {
  roller: BufferGeometry
}

export function buildTextureRoller({ params, parsedSvg }: BuildTextureRollerInput): BuildTextureRollerResult {
  const { height, cols, bodyRows } = buildHeightField(params, parsedSvg)
  const profile = buildProfile(params, bodyRows)
  const nSegments = cols
  const positions: number[] = []
  const rings: { start: number; apex: boolean; heights: Float32Array | null }[] = []

  for (const sample of profile) {
    const start = positions.length / 3
    if (sample.radius < 1e-4) {
      positions.push(sample.x, 0, 0)
      rings.push({ start, apex: true, heights: null })
      continue
    }
    const ringHeights = sample.body
      ? height.subarray(sample.row * cols, (sample.row + 1) * cols)
      : null
    for (let j = 0; j < nSegments; j++) {
      const a = (j / nSegments) * Math.PI * 2
      const r = sample.radius + (ringHeights ? ringHeights[j] : 0)
      positions.push(sample.x, r * Math.cos(a), r * Math.sin(a))
    }
    rings.push({ start, apex: false, heights: ringHeights })
  }

  const bodyIndices: number[] = []
  const reliefIndices: number[] = []
  const emit = (target: number[], a: number, b: number, c: number) => target.push(a, b, c)

  for (let i = 0; i + 1 < rings.length; i++) {
    const a = rings[i]
    const b = rings[i + 1]
    if (a.apex || b.apex) {
      if (a.apex) {
        for (let j = 0; j < nSegments; j++) {
          const j2 = (j + 1) % nSegments
          emit(bodyIndices, a.start, b.start + j2, b.start + j)
        }
      } else {
        for (let j = 0; j < nSegments; j++) {
          const j2 = (j + 1) % nSegments
          emit(bodyIndices, b.start, a.start + j, a.start + j2)
        }
      }
      continue
    }
    for (let j = 0; j < nSegments; j++) {
      const j2 = (j + 1) % nSegments
      const relief = a.heights !== null && b.heights !== null
        && Math.max(a.heights[j], a.heights[j2], b.heights[j], b.heights[j2]) > 1e-6
      const target = relief ? reliefIndices : bodyIndices
      emit(target, a.start + j, b.start + j2, b.start + j)
      emit(target, a.start + j, a.start + j2, b.start + j2)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex([...bodyIndices, ...reliefIndices])
  geometry.addGroup(0, bodyIndices.length, 0)
  geometry.addGroup(bodyIndices.length, reliefIndices.length, 1)
  geometry.computeVertexNormals()
  return { roller: geometry }
}
