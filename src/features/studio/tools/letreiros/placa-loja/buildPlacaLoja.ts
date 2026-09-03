import { BufferGeometry, ExtrudeGeometry, Path, Shape } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Evaluator, SUBTRACTION, Brush } from 'three-bvh-csg'
import { nameToGeometry } from './textToGeometry'
import type { PlacaLojaParams, TextItem } from './schema'

export interface BuildPlacaLojaInput {
  font?: Font
  fonts?: Partial<Record<string, Font>>
  params: PlacaLojaParams
  onError?: (message: string) => void
}

export interface BuildPlacaLojaResult {
  base: BufferGeometry
  text: BufferGeometry
  textItems: Array<{ id: string; geometry: BufferGeometry }>
}

const TEXT_MARGIN = 3
const TEXT_Z_OFFSET = 0.01

function resolveFont(
  fonts: Partial<Record<string, Font>> | undefined,
  font: Font | undefined,
  style: string,
): Font {
  if (fonts?.[style]) return fonts[style]!
  if (font) return font
  throw new Error(`No font provided for style "${style}"`)
}

function buildScaledText({
  font,
  name,
  textSize,
  targetWidth,
  depth,
}: {
  font: Font
  name: string
  textSize: number
  targetWidth: number
  depth: number
}): BufferGeometry {
  const geometry = nameToGeometry({ font, name, size: textSize, depth })
  geometry.computeBoundingBox()
  const naturalWidth = geometry.boundingBox
    ? geometry.boundingBox.max.x - geometry.boundingBox.min.x
    : 0
  if (naturalWidth > targetWidth && naturalWidth > 0) {
    const scale = targetWidth / naturalWidth
    geometry.scale(scale, scale, 1)
    geometry.center()
  }
  return geometry
}

function buildItemGeometry(
  item: TextItem,
  resolvedFont: Font,
  availableWidth: number,
): BufferGeometry {
  const targetWidth = Math.min(item.width, availableWidth)
  return buildScaledText({
    font: resolvedFont,
    name: item.content,
    textSize: item.height,
    targetWidth,
    depth: item.relief,
  })
}

function buildBaseShape(params: PlacaLojaParams): Shape {
  const baseShape = new Shape()
  const halfWidth = params.width / 2
  const halfHeight = params.height / 2

  if (params.shape === 'rounded') {
    const r = Math.min(params.cornerRadius, halfWidth, halfHeight)
    baseShape.moveTo(-halfWidth + r, -halfHeight)
    baseShape.lineTo(halfWidth - r, -halfHeight)
    baseShape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + r)
    baseShape.lineTo(halfWidth, halfHeight - r)
    baseShape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - r, halfHeight)
    baseShape.lineTo(-halfWidth + r, halfHeight)
    baseShape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - r)
    baseShape.lineTo(-halfWidth, -halfHeight + r)
    baseShape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + r, -halfHeight)
  } else {
    baseShape.moveTo(-halfWidth, -halfHeight)
    baseShape.lineTo(halfWidth, -halfHeight)
    baseShape.lineTo(halfWidth, halfHeight)
    baseShape.lineTo(-halfWidth, halfHeight)
    baseShape.lineTo(-halfWidth, -halfHeight)
  }

  const holeRadius = params.screwHoleDiameter / 2
  const holePositions = [
    { x: halfWidth - params.screwHoleMargin, y: halfHeight - params.screwHoleMargin },
    { x: -(halfWidth - params.screwHoleMargin), y: halfHeight - params.screwHoleMargin },
    { x: halfWidth - params.screwHoleMargin, y: -(halfHeight - params.screwHoleMargin) },
    { x: -(halfWidth - params.screwHoleMargin), y: -(halfHeight - params.screwHoleMargin) },
  ]

  for (const pos of holePositions) {
    const holePath = new Path()
    holePath.absarc(pos.x, pos.y, holeRadius, 0, Math.PI * 2, false)
    baseShape.holes.push(holePath)
  }

  return baseShape
}

export function buildPlacaLoja({
  font,
  fonts,
  params,
  onError,
}: BuildPlacaLojaInput): BuildPlacaLojaResult {
  const baseShape = buildBaseShape(params)
  const baseGeometry = new ExtrudeGeometry(baseShape, {
    depth: params.thickness,
    bevelEnabled: false,
  })

  const availableWidth = params.width - 2 * TEXT_MARGIN
  const availableHeight = params.height - 2 * TEXT_MARGIN

  const textGeometries: BufferGeometry[] = []
  const textItems: Array<{ id: string; geometry: BufferGeometry }> = []

  for (let i = 0; i < params.texts.length; i++) {
    const item = params.texts[i]
    const resolvedFont = resolveFont(fonts, font, item.fontStyle)
    const textGeometry = buildItemGeometry(item, resolvedFont, availableWidth)

    textGeometry.computeBoundingBox()
    const bb = textGeometry.boundingBox!
    const halfTextWidth = (bb.max.x - bb.min.x) / 2
    const halfTextHeight = (bb.max.y - bb.min.y) / 2

    const maxOffsetX = availableWidth / 2 - halfTextWidth
    const maxOffsetY = availableHeight / 2 - halfTextHeight
    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, item.offsetX))
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, item.offsetY))

    textGeometry.translate(clampedX, clampedY, params.thickness - TEXT_Z_OFFSET)
    textGeometries.push(textGeometry)
    textItems.push({ id: item.id, geometry: textGeometry })
  }

  if (textGeometries.length === 0) {
    return {
      base: baseGeometry,
      text: new BufferGeometry(),
      textItems: [],
    }
  }

  if (params.textMode === 'raised') {
    const merged = mergeGeometries(textGeometries) ?? textGeometries[0]
    merged.computeVertexNormals()
    baseGeometry.computeVertexNormals()
    return {
      base: baseGeometry,
      text: merged,
      textItems,
    }
  }

  try {
    const mergedText = mergeGeometries(textGeometries) ?? textGeometries[0]
    const displayText = mergedText.clone()
    displayText.translate(0, 0, params.thickness - TEXT_Z_OFFSET)
    const evaluator = new Evaluator()
    const result = evaluator.evaluate(new Brush(baseGeometry), new Brush(mergedText), SUBTRACTION)
    result.geometry.computeVertexNormals()
    return {
      base: result.geometry,
      text: displayText,
      textItems,
    }
  } catch {
    onError?.('Falha na gravação; usando relevo')
    const fallbackMerged = mergeGeometries(textGeometries) ?? textGeometries[0]
    fallbackMerged.computeVertexNormals()
    baseGeometry.computeVertexNormals()
    return {
      base: baseGeometry,
      text: fallbackMerged,
      textItems,
    }
  }
}

export function disposePlacaLojaResult(result: BuildPlacaLojaResult): void {
  result.base.dispose()
  result.text.dispose()
  result.textItems.forEach((item) => item.geometry.dispose())
}
