import { BufferGeometry, ExtrudeGeometry, Shape, Path, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { TextItem } from './schema'

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

function createTextShape(font: Font, text: TextItem): { shape: Shape | null; bb: { minX: number; maxX: number; minY: number; maxY: number } | null } {
  const geom = new TextGeometry(text.content, {
    font,
    size: text.height,
    depth: 0,
    curveSegments: 8,
    bevelEnabled: false,
  })
  geom.computeBoundingBox()

  const shapes = font.generateShapes(text.content, text.height)
  if (shapes.length === 0) return { shape: null, bb: null }

  const shape = shapes[0]
  const bb = geom.boundingBox!

  // Center the shape and apply offset
  const centerX = (bb.max.x + bb.min.x) / 2
  const centerY = (bb.max.y + bb.min.y) / 2

  const points = shape.getPoints()
  const centeredPoints = points.map(p => new Vector2(
    p.x - centerX + text.offsetX,
    p.y - centerY + text.offsetY,
  ))
  const centeredShape = new Shape(centeredPoints)

  // Also center holes if any
  for (const hole of shape.holes) {
    const holePoints = hole.getPoints()
    const centeredHolePoints = holePoints.map(p => new Vector2(
      p.x - centerX + text.offsetX,
      p.y - centerY + text.offsetY,
    ))
    centeredShape.holes.push(new Path(centeredHolePoints))
  }

  return {
    shape: centeredShape,
    bb: {
      minX: bb.min.x - centerX + text.offsetX,
      maxX: bb.max.x - centerX + text.offsetX,
      minY: bb.min.y - centerY + text.offsetY,
      maxY: bb.max.y - centerY + text.offsetY,
    },
  }
}

function offsetShape(shape: Shape, amount: number): Shape {
  const points = shape.getPoints()
  const expanded: Vector2[] = []

  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length]
    const curr = points[i]
    const next = points[(i + 1) % points.length]

    // Calculate normals (perpendicular to edge, pointing outward)
    const dx1 = curr.x - prev.x
    const dy1 = curr.y - prev.y
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1
    // For outward normal in CCW winding: (dy, -dx)
    const nx1 = dy1 / len1
    const ny1 = -dx1 / len1

    const dx2 = next.x - curr.x
    const dy2 = next.y - curr.y
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1
    const nx2 = dy2 / len2
    const ny2 = -dx2 / len2

    // Average normal
    const nx = (nx1 + nx2) / 2
    const ny = (ny1 + ny2) / 2
    const nLen = Math.sqrt(nx * nx + ny * ny) || 1

    expanded.push(new Vector2(
      curr.x + (nx / nLen) * amount,
      curr.y + (ny / nLen) * amount,
    ))
  }

  return new Shape(expanded)
}

export function createNameOutline({
  font,
  texts,
  borderWidth,
}: CreateNameOutlineInput): NameOutlineResult {
  const fillGeometries: BufferGeometry[] = []
  const outlineGeometries: BufferGeometry[] = []

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

  for (const text of texts) {
    const { shape, bb } = createTextShape(font, text)
    if (!shape || !bb) continue

    // Fill geometry (the text itself)
    const fillGeom = new ExtrudeGeometry(shape, {
      depth: text.relief,
      bevelEnabled: false,
    })
    fillGeometries.push(fillGeom)

    // Outline geometry (offset shape with hole)
    const outlineShape = offsetShape(shape, borderWidth)

    // Create hole in outline using original shape
    const holePath = new Path(shape.getPoints())
    outlineShape.holes.push(holePath)

    const outlineGeom = new ExtrudeGeometry(outlineShape, {
      depth: text.relief,
      bevelEnabled: false,
    })
    outlineGeometries.push(outlineGeom)

    // Update bounding box
    minX = Math.min(minX, bb.minX)
    maxX = Math.max(maxX, bb.maxX)
    minY = Math.min(minY, bb.minY)
    maxY = Math.max(maxY, bb.maxY)
  }

  const outline = outlineGeometries.length > 0 ? mergeGeometries(outlineGeometries) : new BufferGeometry()
  const fill = fillGeometries.length > 0 ? mergeGeometries(fillGeometries) : new BufferGeometry()

  return {
    outline,
    fill,
    boundingBox: { minX, maxX, minY, maxY },
  }
}
