import { ExtrudeGeometry, Shape, Path, Vector2 } from 'three'
import type { BufferGeometry } from 'three'
import ClipperLib from 'js-clipper'
import type { BoundingBox2D } from './positioning'

export interface ClipperPoint {
  X: number
  Y: number
}

export function shapeToClipperPaths(shape: Shape): ClipperPoint[][] {
  const paths: ClipperPoint[][] = []

  const outerPoints = shape.getPoints().map(p => ({ X: Math.round(p.x * 1000), Y: Math.round(p.y * 1000) }))
  paths.push(outerPoints)

  for (const hole of shape.holes) {
    const holePoints = hole.getPoints().map(p => ({ X: Math.round(p.x * 1000), Y: Math.round(p.y * 1000) }))
    paths.push(holePoints)
  }

  return paths
}

export function clipperPathsToShape(paths: ClipperPoint[][]): Shape {
  if (paths.length === 0) return new Shape()

  const outer = paths[0]
  const outerPoints = outer.map(p => new Vector2(p.X / 1000, p.Y / 1000))
  const shape = new Shape(outerPoints)

  for (let i = 1; i < paths.length; i++) {
    const holePoints = paths[i].map(p => new Vector2(p.X / 1000, p.Y / 1000))
    shape.holes.push(new Path(holePoints))
  }

  return shape
}

export function expandShape(shape: Shape, amount: number): Shape {
  const paths = shapeToClipperPaths(shape)
  const offset = new ClipperLib.ClipperOffset()
  const solution = new ClipperLib.Paths()

  offset.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
  offset.Execute(solution, amount)

  return clipperPathsToShape(solution)
}

export function intersectShapes(shape1: Shape, shape2: Shape): Shape {
  const clipper = new ClipperLib.Clipper()

  const paths1 = shapeToClipperPaths(shape1)
  const paths2 = shapeToClipperPaths(shape2)

  clipper.AddPaths(paths1, ClipperLib.PolyType.ptSubject, true)
  clipper.AddPaths(paths2, ClipperLib.PolyType.ptClip, true)

  const solution = new ClipperLib.Paths()
  clipper.Execute(
    ClipperLib.ClipType.ctIntersection,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  )

  return clipperPathsToShape(solution)
}

export function subtractShapes(block: Shape, hole: Shape): Shape {
  const clipper = new ClipperLib.Clipper()

  const paths1 = shapeToClipperPaths(block)
  const paths2 = shapeToClipperPaths(hole)

  clipper.AddPaths(paths1, ClipperLib.PolyType.ptSubject, true)
  clipper.AddPaths(paths2, ClipperLib.PolyType.ptClip, true)

  const solution = new ClipperLib.Paths()
  clipper.Execute(
    ClipperLib.ClipType.ctDifference,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  )

  return clipperPathsToShape(solution)
}

export function unionShapes(shapes: Shape[]): Shape {
  if (shapes.length === 0) return new Shape()
  if (shapes.length === 1) return shapes[0]

  const clipper = new ClipperLib.Clipper()

  for (const shape of shapes) {
    const paths = shapeToClipperPaths(shape)
    clipper.AddPaths(paths, ClipperLib.PolyType.ptSubject, true)
  }

  const solution = new ClipperLib.Paths()
  clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  )

  return clipperPathsToShape(solution)
}

export interface CreateNameOutlineInput {
  shapes: Shape[]
  borderWidth: number
  thickness: number
}

export interface NameOutlineResult {
  outline: BufferGeometry
  boundingBox: BoundingBox2D
}

export function createNameOutline({
  shapes,
  borderWidth,
  thickness,
}: CreateNameOutlineInput): NameOutlineResult {
  if (shapes.length === 0) {
    const empty = new Shape()
    return {
      outline: new ExtrudeGeometry(empty, { depth: thickness, bevelEnabled: false }),
      boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    }
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const shape of shapes) {
    for (const p of shape.getPoints()) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
  }

  const union = unionShapes(shapes)
  const expanded = expandShape(union, borderWidth)
  const rectangle = new Shape([
    new Vector2(minX - borderWidth, minY - borderWidth),
    new Vector2(maxX + borderWidth, minY - borderWidth),
    new Vector2(maxX + borderWidth, maxY + borderWidth),
    new Vector2(minX - borderWidth, maxY + borderWidth),
  ])
  const baseShape = intersectShapes(expanded, rectangle)

  return {
    outline: new ExtrudeGeometry(baseShape, { depth: thickness, bevelEnabled: false }),
    boundingBox: {
      minX: minX - borderWidth, maxX: maxX + borderWidth,
      minY: minY - borderWidth, maxY: maxY + borderWidth,
    },
  }
}
