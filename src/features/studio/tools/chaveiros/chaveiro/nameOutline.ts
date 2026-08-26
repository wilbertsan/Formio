import { BufferGeometry, ExtrudeGeometry, Shape, Path, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import ClipperLib from 'js-clipper'
import type { TextItem } from './schema'

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

interface CreateNameOutlineInput {
  font: Font
  texts: TextItem[]
  borderWidth: number
}

interface NameOutlineResult {
  outline: BufferGeometry
  fill: BufferGeometry
  boundingBox: { minX: number; maxX: number; minY: number; maxY: number }
}

export function createNameOutline({
  font,
  texts,
  borderWidth,
}: CreateNameOutlineInput): NameOutlineResult {
  const letterShapes: Shape[] = []

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

  // Primeiro, calcular o bounding box global de todas as letras
  for (const text of texts) {
    const shapes = font.generateShapes(text.content, text.height)
    
    for (const shape of shapes) {
      const points = shape.getPoints()
      for (const p of points) {
        minX = Math.min(minX, p.x + text.offsetX)
        maxX = Math.max(maxX, p.x + text.offsetX)
        minY = Math.min(minY, p.y + text.offsetY)
        maxY = Math.max(maxY, p.y + text.offsetY)
      }
      for (const hole of shape.holes) {
        for (const p of hole.getPoints()) {
          minX = Math.min(minX, p.x + text.offsetX)
          maxX = Math.max(maxX, p.x + text.offsetX)
          minY = Math.min(minY, p.y + text.offsetY)
          maxY = Math.max(maxY, p.y + text.offsetY)
        }
      }
    }
  }

  // Centralizar todas as letras no meio do bounding box global
  const globalCenterX = (minX + maxX) / 2
  const globalCenterY = (minY + maxY) / 2

  // Agora processar cada letra com offset relativo ao centro global
  for (const text of texts) {
    const shapes = font.generateShapes(text.content, text.height)
    
    for (const shape of shapes) {
      const points = shape.getPoints()
      let shapeMinX = Infinity, shapeMaxX = -Infinity, shapeMinY = Infinity, shapeMaxY = -Infinity
      for (const p of points) {
        shapeMinX = Math.min(shapeMinX, p.x)
        shapeMaxX = Math.max(shapeMaxX, p.x)
        shapeMinY = Math.min(shapeMinY, p.y)
        shapeMaxY = Math.max(shapeMaxY, p.y)
      }
      
      // Offset da letra: posição original + offset do texto - centro global
      const letterOffsetX = text.offsetX - globalCenterX
      const letterOffsetY = text.offsetY - globalCenterY
      
      const centeredPoints = shape.getPoints().map(p => new Vector2(
        p.x + letterOffsetX,
        p.y + letterOffsetY,
      ))
      const centeredShape = new Shape(centeredPoints)
      
      // Preservar furos
      for (const hole of shape.holes) {
        const centeredHolePoints = hole.getPoints().map(p => new Vector2(
          p.x + letterOffsetX,
          p.y + letterOffsetY,
        ))
        centeredShape.holes.push(new Path(centeredHolePoints))
      }
      
      letterShapes.push(centeredShape)
    }
  }

  // Unir todas as letras em um shape
  const combinedTextShape = unionShapes(letterShapes)

  // Criar retângulo com margem de borderWidth
  const rectMinX = minX - globalCenterX - borderWidth
  const rectMaxX = maxX - globalCenterX + borderWidth
  const rectMinY = minY - globalCenterY - borderWidth
  const rectMaxY = maxY - globalCenterY + borderWidth

  const rectangle = new Shape([
    new Vector2(rectMinX, rectMinY),
    new Vector2(rectMaxX, rectMinY),
    new Vector2(rectMaxX, rectMaxY),
    new Vector2(rectMinX, rectMaxY),
  ])

  // Expandir nome em borderWidth
  const expandedTextShape = expandShape(combinedTextShape, borderWidth)

  // Interseção: nome expandido ∩ retângulo
  const baseShape = intersectShapes(expandedTextShape, rectangle)

  // Gerar geometrias
  const relief = texts[0]?.relief ?? 1

  const fill = new ExtrudeGeometry(combinedTextShape, {
    depth: relief,
    bevelEnabled: false,
  })

  const outline = new ExtrudeGeometry(baseShape, {
    depth: relief,
    bevelEnabled: false,
  })

  return {
    outline,
    fill,
    boundingBox: {
      minX: rectMinX,
      maxX: rectMaxX,
      minY: rectMinY,
      maxY: rectMaxY,
    },
  }
}
