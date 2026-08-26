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

  // Processar cada texto
  for (const text of texts) {
    const shapes = font.generateShapes(text.content, text.height)
    
    for (const shape of shapes) {
      // Usar coordenadas originais das letras
      const points = shape.getPoints()
      const shapePoints = points.map(p => new Vector2(
        p.x + text.offsetX,
        p.y + text.offsetY,
      ))
      const shapeObj = new Shape(shapePoints)
      
      // Preservar furos
      for (const hole of shape.holes) {
        const holePoints = hole.getPoints().map(p => new Vector2(
          p.x + text.offsetX,
          p.y + text.offsetY,
        ))
        shapeObj.holes.push(new Path(holePoints))
      }
      
      letterShapes.push(shapeObj)
      
      // Atualizar bounding box global
      for (const p of points) {
        minX = Math.min(minX, p.x + text.offsetX)
        maxX = Math.max(maxX, p.x + text.offsetX)
        minY = Math.min(minY, p.y + text.offsetY)
        maxY = Math.max(maxY, p.y + text.offsetY)
      }
    }
  }

  // Unir todas as letras em um shape (coordenadas originais)
  const combinedTextShape = unionShapes(letterShapes)

  // Criar bloco retangular que contenha o texto + margem
  const rectMinX = minX - borderWidth
  const rectMaxX = maxX + borderWidth
  const rectMinY = minY - borderWidth
  const rectMaxY = maxY + borderWidth

  const rectangle = new Shape([
    new Vector2(rectMinX, rectMinY),
    new Vector2(rectMaxX, rectMinY),
    new Vector2(rectMaxX, rectMaxY),
    new Vector2(rectMinX, rectMaxY),
  ])

  // Expandir nome em borderWidth (4mm)
  const expandedTextShape = expandShape(combinedTextShape, borderWidth)

  // Interseção: nome expandido ∩ retângulo = base
  const baseShape = intersectShapes(expandedTextShape, rectangle)

  // Gerar geometrias
  const relief = texts[0]?.relief ?? 1

  // Fill = nome original (coordenadas originais, sem alteração)
  const fill = new ExtrudeGeometry(combinedTextShape, {
    depth: relief,
    bevelEnabled: false,
  })

  // Outline = base (subtração)
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
