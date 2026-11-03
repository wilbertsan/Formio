import {
  svgRawShapesFromParsed,
  type ParsedSvg,
  type Point2,
} from './svgToIconShape'
import { pathsToShapes, toClipperPaths, unionPaths } from './textOutline'

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
