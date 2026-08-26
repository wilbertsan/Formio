import { BufferGeometry, ExtrudeGeometry, Shape, Vector2 } from 'three'
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

function createTextShape(font: Font, text: TextItem): Shape | null {
  const shapes = font.generateShapes(text.content, text.height)
  if (shapes.length === 0) return null

  const shape = shapes[0]
  const points = shape.getPoints()
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const offsetX = text.offsetX - centerX
  const offsetY = text.offsetY - centerY

  const translated = new Shape(points.map(p => new Vector2(p.x + offsetX, p.y + offsetY)))
  return translated
}

function expandShape(shape: Shape, amount: number): Shape {
  const points = shape.getPoints()

  let cx = 0, cy = 0
  for (const p of points) {
    cx += p.x
    cy += p.y
  }
  cx /= points.length
  cy /= points.length

  const expanded: Vector2[] = []
  for (const p of points) {
    const dx = p.x - cx
    const dy = p.y - cy
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    expanded.push(new Vector2(
      p.x + (dx / len) * amount,
      p.y + (dy / len) * amount,
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
    const shape = createTextShape(font, text)
    if (!shape) continue

    const fillGeom = new ExtrudeGeometry(shape, {
      depth: text.relief,
      bevelEnabled: false,
    })
    fillGeometries.push(fillGeom)

    const expandedShape = expandShape(shape, borderWidth)
    const outlineGeom = new ExtrudeGeometry(expandedShape, {
      depth: text.relief,
      bevelEnabled: false,
    })
    outlineGeometries.push(outlineGeom)

    fillGeom.computeBoundingBox()
    if (fillGeom.boundingBox) {
      minX = Math.min(minX, fillGeom.boundingBox.min.x)
      maxX = Math.max(maxX, fillGeom.boundingBox.max.x)
      minY = Math.min(minY, fillGeom.boundingBox.min.y)
      maxY = Math.max(maxY, fillGeom.boundingBox.max.y)
    }
  }

  const outline = outlineGeometries.length > 0 ? mergeGeometries(outlineGeometries) : new BufferGeometry()
  const fill = fillGeometries.length > 0 ? mergeGeometries(fillGeometries) : new BufferGeometry()

  return {
    outline,
    fill,
    boundingBox: { minX, maxX, minY, maxY },
  }
}
