import { ExtrudeGeometry, Path, Shape, Vector2, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ParsedSvg, Point2 } from '../../confeitaria/shared/svgToIconShape'
import { svgMotifShapes, type MotifShape } from '../../confeitaria/shared/svgPattern'
import {
  clipPathsToRect,
  pathsToShapes,
  toClipperPaths,
  unionPaths,
  type ClipperPoint,
} from '../../confeitaria/shared/textOutline'
import { PATTERN_CELL_MM, type BookmarkParams, type PatternType } from './schema'
import { bookmarkBaseCenterX } from './positioning'

export const PATTERN_MARGIN_MM = 1
export const PATTERN_EMBED_MM = 0.1
export const PATTERN_BEVEL_MM = 0.1

const circle = (radius: number, segments = 48): Point2[] =>
  Array.from({ length: segments }, (_, i) => {
    const angle = (i / segments) * Math.PI * 2
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
  })

const triangle = (radius = 0.44): Point2[] => [
  { x: 0, y: -radius },
  { x: (radius * Math.sqrt(3)) / 2, y: radius / 2 },
  { x: (-radius * Math.sqrt(3)) / 2, y: radius / 2 },
]

const square = (half = 0.42): Point2[] => [
  { x: -half, y: -half },
  { x: half, y: -half },
  { x: half, y: half },
  { x: -half, y: half },
]

const diamond = (radius = 0.44): Point2[] => [
  { x: 0, y: -radius },
  { x: radius, y: 0 },
  { x: 0, y: radius },
  { x: -radius, y: 0 },
]

export function motifShapes(type: PatternType): MotifShape[] {
  switch (type) {
    case 'triangles':
      return [{ outer: triangle(), holes: [] }]
    case 'squares':
      return [{ outer: square(), holes: [] }]
    case 'circles':
      return [{ outer: circle(0.42), holes: [] }]
    case 'diamonds':
      return [{ outer: diamond(), holes: [] }]
    default:
      return []
  }
}

export function buildPatternShapes(
  params: BookmarkParams,
  parsedSvg: ParsedSvg | null,
): Shape[] {
  if (params.pattern.type === 'none') return []

  const shapes = params.pattern.type === 'svg'
    ? svgMotifShapes(parsedSvg)
    : motifShapes(params.pattern.type)
  if (shapes.length === 0) return []

  const baseCenterX = bookmarkBaseCenterX(params.width, params.text.relief)
  const areaLeft = baseCenterX - params.width / 2 + PATTERN_MARGIN_MM
  const areaRight = baseCenterX + params.width / 2 - PATTERN_MARGIN_MM
  const areaBottom = -params.length / 2 + PATTERN_MARGIN_MM
  const areaTop = params.length / 2 - PATTERN_MARGIN_MM
  const areaWidth = areaRight - areaLeft
  const areaLength = areaTop - areaBottom
  if (areaWidth <= 0 || areaLength <= 0) return []

  const cellMm = PATTERN_CELL_MM[params.pattern.density]
  const cols = Math.max(1, Math.floor(areaWidth / cellMm))
  const rows = Math.max(1, Math.floor(areaLength / cellMm))
  const cellW = areaWidth / cols
  const cellH = areaLength / rows
  const originX = areaLeft
  const originY = areaBottom

  const paths: ClipperPoint[][] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const centerX = originX + (col + 0.5) * cellW
      const centerY = originY + (row + 0.5) * cellH
      for (const motif of shapes) {
        const mapPoint = (p: Point2) =>
          new Vector2(centerX + p.x * cellW, centerY + p.y * cellH)
        const flat = new Shape(motif.outer.map(mapPoint))
        for (const hole of motif.holes) {
          flat.holes.push(new Path(hole.map(mapPoint)))
        }
        for (const path of toClipperPaths([flat])) {
          paths.push(path)
        }
      }
    }
  }

  if (paths.length === 0) return []

  const clipped = clipPathsToRect(
    unionPaths(paths),
    areaLeft,
    areaBottom,
    areaRight,
    areaTop,
  )
  return pathsToShapes(clipped)
}

export function buildPatternGeometry(
  params: BookmarkParams,
  parsedSvg: ParsedSvg | null,
): BufferGeometry | null {
  const shapes = buildPatternShapes(params, parsedSvg)
  if (shapes.length === 0) return null

  const extrusions = shapes.map((shape) =>
    new ExtrudeGeometry(shape, {
      // O bevel estende a extrusão em bevelThickness nas duas pontas;
      // compensamos para o topo ficar exatamente em thickness + depth.
      depth: params.pattern.depth + PATTERN_EMBED_MM - PATTERN_BEVEL_MM,
      bevelEnabled: true,
      bevelThickness: PATTERN_BEVEL_MM,
      bevelSize: PATTERN_BEVEL_MM,
      bevelSegments: 1,
    }),
  )
  const merged = mergeGeometries(extrusions)
  extrusions.forEach((geometry) => geometry.dispose())
  if (!merged) return null

  merged.translate(0, 0, params.thickness - PATTERN_EMBED_MM)
  return merged
}
