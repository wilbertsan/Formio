import { Vector2 } from 'three'
import {
  strokeToShape,
  svgRawShapesFromParsed,
  type ParsedShape,
  type ParsedStroke,
  type ParsedSvg,
  type Point2,
} from './svgToIconShape'
import {
  offsetPaths, pathsToShapes, toClipperPaths, unionPaths, type ClipperPoint,
} from './textOutline'

export interface MotifShape {
  outer: Point2[]
  holes: Point2[][]
}

/**
 * Converte um SVG em motivos unitários centralizados, mantendo a proporção.
 * O eixo Y do SVGLoader é invertido para coincidir com o plano Three.js.
 */
export function svgMotifShapes(
  parsed: ParsedSvg | null,
  targetSpan = 0.88,
): MotifShape[] {
  if (!parsed) return []
  const raw = svgRawShapesFromParsed(parsed)
  if (raw.length === 0) return []
  const merged = pathsToShapes(unionPaths(toClipperPaths(raw)))
  if (merged.length === 0) return []

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const shape of merged) {
    for (const p of [...shape.getPoints(), ...shape.holes.flatMap((h) => h.getPoints())]) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
  }
  const span = Math.max(maxX - minX, maxY - minY)
  if (!Number.isFinite(span) || span <= 0) return []
  const scale = targetSpan / span
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  return merged.map((shape) => ({
    outer: shape.getPoints().map((p) => ({ x: (p.x - cx) * scale, y: -(p.y - cy) * scale })),
    holes: shape.holes.map((h) => h.getPoints().map((p) => ({
      x: (p.x - cx) * scale,
      y: -(p.y - cy) * scale,
    }))),
  }))
}

function toClipperPath(points: Point2[]): ClipperPoint[] {
  return points.map((p) => ({ X: Math.round(p.x * 1000), Y: Math.round(p.y * 1000) }))
}

function fillClipperPaths(fill: ParsedShape): ClipperPoint[][] {
  const paths: ClipperPoint[][] = []
  if (fill.outer.length >= 3) paths.push(toClipperPath(fill.outer))
  for (const hole of fill.holes) {
    if (hole.length >= 3) paths.push(toClipperPath(hole))
  }
  return paths
}

function strokeClipperPaths(stroke: ParsedStroke, minWidth: number): ClipperPoint[][] {
  const outline = strokeToShape(
    stroke.points.map((p) => new Vector2(p.x, p.y)),
    1,
    Math.max(stroke.width, minWidth) / 2,
  )
  return outline ? toClipperPaths([outline]) : []
}

export interface SvgPatternOptions {
  /** Maior dimensão final do motivo, em mm. */
  targetSpan: number
  /** Espessura mínima imprimível, em mm. */
  minFeatureMm: number
}

/**
 * Converte o SVG em motivos fechados, centrados na origem, em mm, com escala
 * uniforme e mínimo imprimível. Preenchimentos sólidos não são alterados.
 */
export function svgPatternShapes(
  parsed: ParsedSvg | null,
  { targetSpan, minFeatureMm }: SvgPatternOptions,
): MotifShape[] {
  if (!parsed) return []

  const points: Point2[] = []
  for (const fill of parsed.fills) {
    points.push(...fill.outer)
    for (const hole of fill.holes) points.push(...hole)
  }
  for (const stroke of parsed.strokes) {
    for (const p of stroke.points) {
      const half = stroke.width / 2
      points.push({ x: p.x - half, y: p.y - half }, { x: p.x + half, y: p.y + half })
    }
  }
  if (points.length === 0) return []

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const span = Math.max(maxX - minX, maxY - minY)
  if (!Number.isFinite(span) || span <= 0) return []

  // Primeira passada: encaixa sem reservar. Só reserva o mínimo se houver
  // traço fino ou preenchimento que desaparece com o recuo de 0,8 mm.
  const scale0 = targetSpan / span
  const minSource0 = minFeatureMm / scale0
  const thinFill = parsed.fills.some((fill) => {
    const fillPaths = fillClipperPaths(fill)
    return fillPaths.length > 0 && offsetPaths(fillPaths, -minSource0 / 2).length === 0
  })
  const thinStroke = parsed.strokes.some((stroke) => stroke.width < minSource0)
  const reserve = thinFill || thinStroke ? minFeatureMm : 0
  const usable = Math.max(1e-6, targetSpan - reserve)
  const scale = usable / span
  const minSource = minFeatureMm / scale

  const paths: ClipperPoint[][] = []
  for (const fill of parsed.fills) {
    const fillPaths = fillClipperPaths(fill)
    if (fillPaths.length === 0) continue
    const thin = offsetPaths(fillPaths, -minSource / 2).length === 0
    paths.push(...(thin ? offsetPaths(fillPaths, minSource / 2) : fillPaths))
  }
  for (const stroke of parsed.strokes) {
    paths.push(...strokeClipperPaths(stroke, minSource))
  }
  if (paths.length === 0) return []

  const merged = pathsToShapes(unionPaths(paths))
  if (merged.length === 0) return []

  let sMinX = Infinity
  let sMaxX = -Infinity
  let sMinY = Infinity
  let sMaxY = -Infinity
  for (const shape of merged) {
    for (const p of [...shape.getPoints(), ...shape.holes.flatMap((h) => h.getPoints())]) {
      sMinX = Math.min(sMinX, p.x)
      sMaxX = Math.max(sMaxX, p.x)
      sMinY = Math.min(sMinY, p.y)
      sMaxY = Math.max(sMaxY, p.y)
    }
  }
  const sSpan = Math.max(sMaxX - sMinX, sMaxY - sMinY)
  if (!Number.isFinite(sSpan) || sSpan <= 0) return []

  const finalScale = targetSpan / sSpan
  const cx = (sMinX + sMaxX) / 2
  const cy = (sMinY + sMaxY) / 2

  return merged.map((shape) => ({
    outer: shape.getPoints().map((p) => ({
      x: (p.x - cx) * finalScale,
      y: -(p.y - cy) * finalScale,
    })),
    holes: shape.holes.map((hole) => hole.getPoints().map((p) => ({
      x: (p.x - cx) * finalScale,
      y: -(p.y - cy) * finalScale,
    }))),
  }))
}
