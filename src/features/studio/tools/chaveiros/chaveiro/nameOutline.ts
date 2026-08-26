import { BufferGeometry, ExtrudeGeometry, Shape, Path, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
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
  const shapes = font.generateShapes(text.content, text.height)
  if (shapes.length === 0) return { shape: null, bb: null }

  const shape = shapes[0]

  // Calculate bounding box from shape points
  const points = shape.getPoints()
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }

  // Center the shape and apply offset
  const centerX = (maxX + minX) / 2
  const centerY = (maxY + minY) / 2

  const centeredPoints = points.map(p => new Vector2(
    p.x - centerX + text.offsetX,
    p.y - centerY + text.offsetY,
  ))
  const centeredShape = new Shape(centeredPoints)

  // Also center holes if any (for letters like A, O, B)
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
      minX: minX - centerX + text.offsetX,
      maxX: maxX - centerX + text.offsetX,
      minY: minY - centerY + text.offsetY,
      maxY: maxY - centerY + text.offsetY,
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

function offsetHoles(shape: Shape, amount: number): void {
  const offsetHoles: Path[] = []

  for (const hole of shape.holes) {
    const points = hole.getPoints()
    const expanded: Vector2[] = []

    for (let i = 0; i < points.length; i++) {
      const prev = points[(i - 1 + points.length) % points.length]
      const curr = points[i]
      const next = points[(i + 1) % points.length]

      // For holes (CW winding), outward is inward, so flip the normal
      const dx1 = curr.x - prev.x
      const dy1 = curr.y - prev.y
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1
      // For inward normal in CW winding: (-dy, dx)
      const nx1 = -dy1 / len1
      const ny1 = dx1 / len1

      const dx2 = next.x - curr.x
      const dy2 = next.y - curr.y
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1
      const nx2 = -dy2 / len2
      const ny2 = dx2 / len2

      const nx = (nx1 + nx2) / 2
      const ny = (ny1 + ny2) / 2
      const nLen = Math.sqrt(nx * nx + ny * ny) || 1

      expanded.push(new Vector2(
        curr.x + (nx / nLen) * amount,
        curr.y + (ny / nLen) * amount,
      ))
    }

    offsetHoles.push(new Path(expanded))
  }

  shape.holes = offsetHoles
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

    // Outline geometry: expanded outer contour with original as hole
    const outlineShape = offsetShape(shape, borderWidth)

    // Also offset the holes inward (to maintain wall thickness)
    offsetHoles(outlineShape, -borderWidth)

    // Add the original shape as a hole to create the border ring
    const holePath = new Path(shape.getPoints())
    outlineShape.holes.push(holePath)

    // Also add original holes back
    for (const hole of shape.holes) {
      outlineShape.holes.push(new Path(hole.getPoints()))
    }

    const outlineGeom = new ExtrudeGeometry(outlineShape, {
      depth: text.relief,
      bevelEnabled: false,
    })
    outlineGeometries.push(outlineGeom)

    // Update bounding box
    minX = Math.min(minX, bb.minX - borderWidth)
    maxX = Math.max(maxX, bb.maxX + borderWidth)
    minY = Math.min(minY, bb.minY - borderWidth)
    maxY = Math.max(maxY, bb.maxY + borderWidth)
  }

  const outline = outlineGeometries.length > 0 ? mergeGeometries(outlineGeometries) : new BufferGeometry()
  const fill = fillGeometries.length > 0 ? mergeGeometries(fillGeometries) : new BufferGeometry()

  return {
    outline,
    fill,
    boundingBox: { minX, maxX, minY, maxY },
  }
}
