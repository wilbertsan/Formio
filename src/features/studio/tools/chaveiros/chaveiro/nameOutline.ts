import { BufferGeometry, ExtrudeGeometry, Shape, Vector2 } from 'three'
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

function createTextGeometry(font: Font, text: TextItem): { geometry: BufferGeometry; shape: Shape | null } {
  const geom = new TextGeometry(text.content, {
    font,
    size: text.height,
    depth: text.relief,
    curveSegments: 8,
    bevelEnabled: false,
  })
  geom.computeBoundingBox()

  const shapes = font.generateShapes(text.content, text.height)
  const shape = shapes.length > 0 ? shapes[0] : null

  if (geom.boundingBox) {
    const bb = geom.boundingBox
    const offsetX = text.offsetX - (bb.max.x + bb.min.x) / 2
    const offsetY = text.offsetY - (bb.max.y + bb.min.y) / 2
    geom.translate(offsetX, offsetY, 0)
  }

  return { geometry: geom, shape }
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
    const { geometry: fillGeom, shape } = createTextGeometry(font, text)
    if (!shape) continue

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
