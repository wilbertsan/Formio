import { Shape, Vector2 } from 'three'
import ClipperLib from 'js-clipper'
import {
  type ClipperPoint,
  type PathsBounds,
  pathsBoundingBox,
  toClipperPaths,
} from '../../confeitaria/shared/textOutline'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import { getSvgScreenPoints } from './svgOutline'
import { circleShape } from './shapes'
import type { ThermoformerGeometryParams } from './schema'

export type OutlineJoin = 'miter' | 'round'

export interface ShapeOutline {
  kind: 'circle' | 'polygon'
  shape: Shape
  points: Vector2[]
  bounds: PathsBounds
  radius: number | null
  paths: ClipperPoint[][] | null
  perforated: ClipperPoint[][] | null
  cavityOpening: ClipperPoint[][] | null
  recess: ClipperPoint[][] | null
  supportOuter: ClipperPoint[][] | null
  join: OutlineJoin
}

/**
 * `MiterLimit` existe no ClipperOffset do js-clipper, mas falta na declaração
 * de tipos do módulo. O limite 2 é o padrão; declará-lo mantém o miter
 * previsível nos cantos.
 */
interface ClipperOffsetHandle {
  AddPaths: (
    paths: ClipperPoint[][],
    joinType: number,
    endType: number,
  ) => void
  Execute: (solution: ClipperPoint[][], delta: number) => void
  MiterLimit: number
}

export function offsetOutlinePaths(
  paths: ClipperPoint[][],
  mm: number,
  join: OutlineJoin,
): ClipperPoint[][] {
  if (paths.length === 0) return []
  const offset = new ClipperLib.ClipperOffset() as ClipperOffsetHandle
  const solution = new ClipperLib.Paths()
  offset.AddPaths(
    paths,
    join === 'miter' ? ClipperLib.JoinType.jtMiter : ClipperLib.JoinType.jtRound,
    ClipperLib.EndType.etClosedPolygon,
  )
  offset.MiterLimit = 2
  offset.Execute(solution, Math.round(mm * 1000))
  return solution as ClipperPoint[][]
}

export function pointInPaths(
  x: number,
  y: number,
  paths: ClipperPoint[][],
): boolean {
  const point = { X: Math.round(x * 1000), Y: Math.round(y * 1000) }
  return paths.some(
    (path) => ClipperLib.Clipper.PointInPolygon(point, path) === 1,
  )
}

export function squarePoints(size: number): Vector2[] {
  const half = size / 2
  return [
    new Vector2(-half, -half),
    new Vector2(half, -half),
    new Vector2(half, half),
    new Vector2(-half, half),
  ]
}

export function rectanglePoints(width: number, height: number): Vector2[] {
  const halfW = width / 2
  const halfH = height / 2
  return [
    new Vector2(-halfW, -halfH),
    new Vector2(halfW, -halfH),
    new Vector2(halfW, halfH),
    new Vector2(-halfW, halfH),
  ]
}

function polygonOutline(
  params: ThermoformerGeometryParams,
  points: Vector2[],
  join: OutlineJoin,
): ShapeOutline {
  const shape = new Shape(points)
  const paths = toClipperPaths([shape])
  const effectiveStep = Math.max(
    params.stepWidth,
    params.frameWidth + params.fitClearance,
  )
  const perforated = offsetOutlinePaths(paths, -params.frameWidth, join)
  const cavityOpening = offsetOutlinePaths(
    paths,
    params.fitClearance - effectiveStep,
    join,
  )
  const recess = offsetOutlinePaths(paths, params.fitClearance, join)
  const supportOuter = offsetOutlinePaths(recess, params.wallThickness, join)

  return {
    kind: 'polygon',
    shape,
    points,
    bounds: pathsBoundingBox(paths),
    radius: null,
    paths,
    perforated,
    cavityOpening,
    recess,
    supportOuter,
    join,
  }
}

export function getShapeOutline(
  params: ThermoformerGeometryParams,
  parsedSvg?: ParsedSvg | null,
): ShapeOutline | null {
  switch (params.shape) {
    case 'circle': {
      const radius = params.diameter / 2
      return {
        kind: 'circle',
        shape: circleShape(radius),
        points: [],
        bounds: {
          minX: -radius,
          maxX: radius,
          minY: -radius,
          maxY: radius,
          width: radius * 2,
          height: radius * 2,
        },
        radius,
        paths: null,
        perforated: null,
        cavityOpening: null,
        recess: null,
        supportOuter: null,
        join: 'round',
      }
    }
    case 'square':
      return polygonOutline(params, squarePoints(params.width), 'miter')
    case 'rectangle':
      return polygonOutline(
        params,
        rectanglePoints(params.width, params.height),
        'miter',
      )
    case 'pyramid':
      return polygonOutline(params, squarePoints(params.width), 'miter')
    case 'svg': {
      if (!parsedSvg) return null
      const points = getSvgScreenPoints(parsedSvg, params.svgSize)
      return points ? polygonOutline(params, points, 'round') : null
    }
  }
}
