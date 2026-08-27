import { type BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { CardParams, FontStyle } from './schema'
import { MARGIN_MIN } from './schema'

export interface BuildCardInput {
  params: CardParams
  font?: Font
}

export interface BuildCardResult {
  base: BufferGeometry
  text: BufferGeometry | null
  textBlocks: Array<{ id: string; geometry: BufferGeometry }>
}

function createRoundedRectShape(
  width: number,
  height: number,
  radius: number,
): Shape {
  const shape = new Shape()
  const r = Math.min(radius, Math.min(width, height) / 2)
  const hw = width / 2
  const hh = height / 2

  shape.moveTo(-hw + r, -hh)
  shape.lineTo(hw - r, -hh)
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r)
  shape.lineTo(hw, hh - r)
  shape.quadraticCurveTo(hw, hh, hw - r, hh)
  shape.lineTo(-hw + r, hh)
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r)
  shape.lineTo(-hw, -hh + r)
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh)

  return shape
}

function resolveFont(fonts: Partial<Record<FontStyle, Font>> | undefined, font: Font | undefined, style: FontStyle): Font {
  if (fonts?.[style]) return fonts[style]!
  if (font) return font
  throw new Error(`No font provided for style "${style}"`)
}

function createTextGeometry(text: string, font: Font, size: number, depth: number): BufferGeometry {
  const geometry = new TextGeometry(text, {
    font,
    size,
    depth,
    curveSegments: 8,
    bevelEnabled: false,
  })
  geometry.center()
  return geometry
}

function clampPosition(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  textBB: { minX: number; maxX: number; minY: number; maxY: number },
): { x: number; y: number } {
  const textHalfWidth = (textBB.maxX - textBB.minX) / 2
  const textHalfHeight = (textBB.maxY - textBB.minY) / 2

  const minX = -halfWidth + MARGIN_MIN + textHalfWidth
  const maxX = halfWidth - MARGIN_MIN - textHalfWidth
  const minY = -halfHeight + MARGIN_MIN + textHalfHeight
  const maxY = halfHeight - MARGIN_MIN - textHalfHeight

  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  }
}

function positionTextBlocks(
  params: CardParams,
  font: Font,
): { textGeometries: BufferGeometry[]; textBlocks: Array<{ id: string; geometry: BufferGeometry }> } {
  const textGeometries: BufferGeometry[] = []
  const textBlocks: Array<{ id: string; geometry: BufferGeometry }> = []

  const halfWidth = params.width / 2
  const halfHeight = params.height / 2
  const spacing = 2

  let currentY = halfHeight - MARGIN_MIN

  for (const block of params.blocks) {
    const textGeometry = createTextGeometry(block.content, font, block.fontSize, block.relief)
    textGeometry.computeBoundingBox()
    const textBB = textGeometry.boundingBox!

    const textHeight = textBB.max.y - textBB.min.y
    currentY -= textHeight

    let x = 0
    if (params.layout === 'left') {
      x = -halfWidth + MARGIN_MIN
    }

    const finalX = x + block.offsetX
    const finalY = currentY + block.offsetY

    const clamped = clampPosition(finalX, finalY, halfWidth, halfHeight, {
      minX: textBB.min.x,
      maxX: textBB.max.x,
      minY: textBB.min.y,
      maxY: textBB.max.y,
    })

    textGeometry.translate(clamped.x, clamped.y, params.thickness - 0.01)
    textGeometries.push(textGeometry)
    textBlocks.push({ id: block.id, geometry: textGeometry })

    currentY -= spacing
  }

  return { textGeometries, textBlocks }
}

export function buildCard({ params, font }: BuildCardInput): BuildCardResult {
  const shape = createRoundedRectShape(params.width, params.height, params.cornerRadius)

  const base = new ExtrudeGeometry(shape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 1,
  })

  base.computeBoundingBox()
  const bb = base.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  base.translate(-cx, -cy, 0)

  if (!font) {
    return {
      base,
      text: null,
      textBlocks: [],
    }
  }

  const resolvedFont = resolveFont(undefined, font, params.blocks[0].fontStyle)
  const { textGeometries, textBlocks } = positionTextBlocks(params, resolvedFont)

  const text = textGeometries.length > 0
    ? mergeGeometries(textGeometries) ?? textGeometries[0]
    : null

  return {
    base,
    text,
    textBlocks,
  }
}
