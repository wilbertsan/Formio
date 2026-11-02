import { ExtrudeGeometry, Shape, Path, Vector2 } from 'three'
import type { BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
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

function toVectorPoints(path: ClipperPoint[]): Vector2[] {
  return path.map(p => new Vector2(p.X / 1000, p.Y / 1000))
}

function pathArea(path: ClipperPoint[]): number {
  return Math.abs(ClipperLib.Clipper.Area(path))
}

const clipperOrientation = (
  ClipperLib.Clipper as unknown as { Orientation: (path: ClipperPoint[]) => boolean }
).Orientation

function pathCentroid(path: ClipperPoint[]): ClipperPoint {
  let x = 0
  let y = 0
  for (const p of path) {
    x += p.X
    y += p.Y
  }
  return { X: x / path.length, Y: y / path.length }
}

export function clipperPathsToShapes(paths: ClipperPoint[][]): Shape[] {
  const validPaths = paths.filter(path => path.length >= 3)
  if (validPaths.length === 0) return []

  const outerPaths: ClipperPoint[][] = []
  const holePaths: ClipperPoint[][] = []

  for (const path of validPaths) {
    if (clipperOrientation(path)) {
      outerPaths.push(path)
    } else {
      holePaths.push(path)
    }
  }

  if (outerPaths.length === 0) {
    let largest = validPaths[0]
    let largestArea = -Infinity
    for (const path of validPaths) {
      const area = pathArea(path)
      if (area > largestArea) {
        largest = path
        largestArea = area
      }
    }
    outerPaths.push(largest)
    const index = holePaths.indexOf(largest)
    if (index >= 0) holePaths.splice(index, 1)
  }

  const shapes = outerPaths.map(path => new Shape(toVectorPoints(path)))
  const areas = outerPaths.map(pathArea)

  for (const hole of holePaths) {
    const centroid = pathCentroid(hole)

    let bestIndex = -1
    let bestArea = Infinity
    for (let i = 0; i < outerPaths.length; i++) {
      if (ClipperLib.Clipper.PointInPolygon(centroid, outerPaths[i]) !== 0 && areas[i] < bestArea) {
        bestArea = areas[i]
        bestIndex = i
      }
    }

    if (bestIndex < 0) {
      let smallestArea = Infinity
      for (let i = 0; i < outerPaths.length; i++) {
        if (areas[i] < smallestArea) {
          smallestArea = areas[i]
          bestIndex = i
        }
      }
    }

    if (bestIndex >= 0) {
      shapes[bestIndex].holes.push(new Path(toVectorPoints(hole)))
    }
  }

  return shapes
}

export function clipperPathsToShape(paths: ClipperPoint[][]): Shape {
  const shapes = clipperPathsToShapes(paths)
  return shapes[0] ?? new Shape()
}

export function expandShape(shape: Shape, amount: number): Shape[] {
  const paths = shapeToClipperPaths(shape)
  const offset = new ClipperLib.ClipperOffset()
  const solution = new ClipperLib.Paths()

  offset.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
  offset.Execute(solution, Math.round(amount * 1000))

  return clipperPathsToShapes(solution)
}

export function intersectShapes(shape1: Shape, shape2: Shape): Shape[] {
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

  return clipperPathsToShapes(solution)
}

export function subtractShapes(block: Shape, hole: Shape): Shape[] {
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

  return clipperPathsToShapes(solution)
}

export function unionShapes(shapes: Shape[]): Shape[] {
  if (shapes.length === 0) return []
  if (shapes.length === 1) return [shapes[0]]

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

  return clipperPathsToShapes(solution)
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
  const expanded = union.flatMap(s => expandShape(s, borderWidth))
  const rectangle = new Shape([
    new Vector2(minX - borderWidth, minY - borderWidth),
    new Vector2(maxX + borderWidth, minY - borderWidth),
    new Vector2(maxX + borderWidth, maxY + borderWidth),
    new Vector2(minX - borderWidth, maxY + borderWidth),
  ])
  const baseShapes = expanded.flatMap(s => intersectShapes(s, rectangle))

  const outline = mergeGeometries(
    baseShapes.map(s => new ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false })),
  ) ?? new ExtrudeGeometry(new Shape(), { depth: thickness, bevelEnabled: false })

  let bbMinX = Infinity, bbMaxX = -Infinity, bbMinY = Infinity, bbMaxY = -Infinity
  for (const shape of baseShapes) {
    for (const p of shape.getPoints()) {
      bbMinX = Math.min(bbMinX, p.x); bbMaxX = Math.max(bbMaxX, p.x)
      bbMinY = Math.min(bbMinY, p.y); bbMaxY = Math.max(bbMaxY, p.y)
    }
  }

  const boundingBox: BoundingBox2D = baseShapes.length > 0
    ? { minX: bbMinX, maxX: bbMaxX, minY: bbMinY, maxY: bbMaxY }
    : {
        minX: minX - borderWidth, maxX: maxX + borderWidth,
        minY: minY - borderWidth, maxY: maxY + borderWidth,
      }

  return { outline, boundingBox }
}
