import { Vector2 } from 'three'
import {
  svgBoundsFromParsed,
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

  const shapes = pathsToShapes(unionPaths(toClipperPaths(raw)))
  if (shapes.length !== 1 || shapes[0].holes.length > 0) {
    return { points: null, error: 'contour' }
  }

  const bounds = svgBoundsFromParsed(parsed)
  if (!bounds) return { points: null, error: 'empty' }
  const span = Math.max(bounds.width, bounds.height)
  if (!Number.isFinite(span) || span <= 0) {
    return { points: null, error: 'empty' }
  }

  const scale = svgSize / span
  const points = shapes[0]
    .getPoints()
    .map((point) => new Vector2(
      (point.x - bounds.centerX) * scale,
      -(point.y - bounds.centerY) * scale,
    ))

  return { points, error: null }
}

export function getSvgScreenPoints(
  parsed: ParsedSvg,
  svgSize: number,
): Vector2[] | null {
  return inspectSvgSilhouette(parsed, svgSize).points
}
