import { ShapeUtils, Vector2 } from 'three'
import {
  svgRawShapesFromParsed,
  type ParsedSvg,
} from '../../confeitaria/shared/svgToIconShape'
import {
  pathsToShapes,
  toClipperPaths,
  unionPaths,
} from '../../confeitaria/shared/textOutline'

export type SvgSilhouetteError = 'empty' | 'contour' | null

export interface SvgSilhouetteResult {
  points: Vector2[] | null
  error: SvgSilhouetteError
}

export function inspectSvgSilhouette(
  parsed: ParsedSvg,
  svgSize: number,
): SvgSilhouetteResult {
  const raw = svgRawShapesFromParsed(parsed)
  if (raw.length === 0) return { points: null, error: 'empty' }

  // O SVG pode declarar o furo com a mesma orientação do contorno externo
  // (`fill-rule="evenodd"`). O union usa NonZero, então normalizamos cada furo
  // para a orientação oposta antes de unir. `setFromPoints` acrescenta curvas
  // ao Path existente, por isso limpamos `curves` antes de reescrevê-lo.
  for (const shape of raw) {
    const outerSign = Math.sign(ShapeUtils.area(shape.getPoints()))
    for (const hole of shape.holes) {
      if (Math.sign(ShapeUtils.area(hole.getPoints())) === outerSign) {
        const reversed = [...hole.getPoints()].reverse()
        hole.curves = []
        hole.setFromPoints(reversed)
      }
    }
  }

  const shapes = pathsToShapes(unionPaths(toClipperPaths(raw)))
  if (shapes.length === 0) return { points: null, error: 'empty' }
  if (shapes.length !== 1 || shapes[0].holes.length > 0) {
    return { points: null, error: 'contour' }
  }

  const shapePoints = shapes[0].getPoints()
  if (shapePoints.length === 0) return { points: null, error: 'empty' }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const point of shapePoints) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }

  const width = maxX - minX
  const height = maxY - minY
  const span = Math.max(width, height)
  if (!Number.isFinite(svgSize) || svgSize <= 0 || !Number.isFinite(span) || span <= 0) {
    return { points: null, error: 'empty' }
  }

  const scale = svgSize / span
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const points = shapePoints.map((point) => new Vector2(
    (point.x - cx) * scale,
    -(point.y - cy) * scale,
  ))

  return { points, error: null }
}

export function getSvgScreenPoints(
  parsed: ParsedSvg,
  svgSize: number,
): Vector2[] | null {
  return inspectSvgSilhouette(parsed, svgSize).points
}
