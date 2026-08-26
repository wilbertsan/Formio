import { type BufferGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Evaluator, SUBTRACTION, Brush } from 'three-bvh-csg'
import { createBaseShape, createReinforcementRing, getRingPosition, type RingParams } from './shapes'
import { nameToGeometry } from './textToGeometry'
import { createNameOutline } from './nameOutline'
import type { BoundingBox2D, Circle2D } from './positioning'
import { TEXT_BORDER_MIN, RING_EDGE_MARGIN } from './schema'
import type { KeychainParams, FontStyle, TextItem } from './schema'

export interface BuildKeychainInput {
  font?: Font
  fonts?: Partial<Record<FontStyle, Font>>
  params: KeychainParams
  onError?: (message: string) => void
}

export interface BuildKeychainResult {
  base: BufferGeometry
  text: BufferGeometry
  textItems: Array<{ id: string; geometry: BufferGeometry }>
  pieceBB: BoundingBox2D
  hole: Circle2D
}

const ENGRAVE_EPSILON = 0.2

function translatedShape(shape: Shape, x: number, y: number): Shape {
  const pts = shape.getPoints()
  const translated = new Shape(pts.map((p) => new Vector2(p.x + x, p.y + y)))
  for (const hole of shape.holes) {
    const holePts = hole.getPoints()
    const translatedHole = new Path(holePts.map((p) => new Vector2(p.x + x, p.y + y)))
    translated.holes.push(translatedHole)
  }
  return translated
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

function resolveFont(
  fonts: Partial<Record<FontStyle, Font>> | undefined,
  font: Font | undefined,
  style: FontStyle,
): Font {
  if (fonts?.[style]) return fonts[style]!
  if (font) return font
  throw new Error(`No font provided for style "${style}"`)
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

export function buildKeychain({
  font,
  fonts,
  params,
  onError,
}: BuildKeychainInput): BuildKeychainResult {
  if (params.baseShape === 'name') {
    return buildNameKeychain({ font, fonts, params, onError })
  }

  const ring: RingParams = {
    position: params.ringPosition,
    innerDiameter: params.ringInnerDiameter,
    embedding: params.ringEmbedding,
    lateralOffset: params.ringLateralOffset,
    radialOffset: params.ringRadialOffset,
  }
  const baseShape = createBaseShape(params.baseShape, params.width, params.height, ring)

  const baseGeometry = new ExtrudeGeometry(baseShape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 1,
  })

  const ringCenter = getRingPosition(params.baseShape, params.width, params.height, ring)
  const reinforcementShape = translatedShape(
    createReinforcementRing(ring),
    ringCenter.x,
    ringCenter.y,
  )
  const reinforcementGeometry = new ExtrudeGeometry(reinforcementShape, {
    depth: params.thickness,
    bevelEnabled: false,
  })

  const mergedBase = mergeGeometries([baseGeometry, reinforcementGeometry]) ?? baseGeometry

  const availableWidth = params.width - 2 * params.borderWidth

  const textGeometries: BufferGeometry[] = []
  const textItems: Array<{ id: string; geometry: BufferGeometry }> = []

  for (let i = 0; i < params.texts.length; i++) {
    const item = params.texts[i]
    const resolvedFont = resolveFont(fonts, font, item.fontStyle)
    const textGeometry = buildItemGeometry(item, resolvedFont, availableWidth)

    textGeometry.computeBoundingBox()
    const bb = textGeometry.boundingBox!
    const halfWidth = (bb.max.x - bb.min.x) / 2

    const textAvailableWidth = params.width / 2 - TEXT_BORDER_MIN
    const clampedX = Math.max(-textAvailableWidth + halfWidth, Math.min(textAvailableWidth - halfWidth, item.offsetX))
    const clampedY = item.offsetY

    textGeometry.translate(clampedX, clampedY, params.thickness - 0.01)
    textGeometries.push(textGeometry)
    textItems.push({ id: item.id, geometry: textGeometry })
  }

  if (params.textMode === 'raised') {
    const merged = mergeGeometries(textGeometries) ?? textGeometries[0]
    merged.computeVertexNormals()
    mergedBase.computeVertexNormals()
    const baseBB = computeBaseBB(mergedBase)
    return {
      base: mergedBase,
      text: merged,
      textItems,
      pieceBB: baseBB.pieceBB,
      hole: baseBB.hole,
    }
  }

  try {
    const mergedText = mergeGeometries(textGeometries) ?? textGeometries[0]
    mergedText.translate(0, 0, ENGRAVE_EPSILON)
    const evaluator = new Evaluator()
    const result = evaluator.evaluate(new Brush(mergedBase), new Brush(mergedText), SUBTRACTION)
    result.geometry.computeVertexNormals()
    const baseBB = computeBaseBB(result.geometry)
    return {
      base: result.geometry,
      text: mergedText,
      textItems,
      pieceBB: baseBB.pieceBB,
      hole: baseBB.hole,
    }
  } catch {
    onError?.('Falha na gravação; usando relevo')
    const fallbackMerged = mergeGeometries(textGeometries) ?? textGeometries[0]
    fallbackMerged.computeVertexNormals()
    mergedBase.computeVertexNormals()
    const baseBB = computeBaseBB(mergedBase)
    return {
      base: mergedBase,
      text: fallbackMerged,
      textItems,
      pieceBB: baseBB.pieceBB,
      hole: baseBB.hole,
    }
  }
}

function computeBaseBB(geometry: BufferGeometry): {
  pieceBB: BoundingBox2D
  hole: Circle2D
} {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const pieceBB: BoundingBox2D = {
    minX: bb.min.x,
    maxX: bb.max.x,
    minY: bb.min.y,
    maxY: bb.max.y,
  }
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  const hole: Circle2D = { x: cx, y: cy, radius: 0 }
  return { pieceBB, hole }
}

function buildNameKeychain({ font, fonts, params }: BuildKeychainInput): BuildKeychainResult {
  const resolvedFont = resolveFont(fonts, font, params.texts[0].fontStyle)

  const { outline, fill, boundingBox } = createNameOutline({
    font: resolvedFont,
    texts: params.texts,
    borderWidth: params.borderWidth,
  })

  // Add ring
  const ring: RingParams = {
    position: params.ringPosition,
    innerDiameter: params.ringInnerDiameter,
    embedding: params.ringEmbedding,
    lateralOffset: params.ringLateralOffset,
    radialOffset: params.ringRadialOffset,
  }

  // Calculate ring position relative to bounding box
  // Position ring so it connects to the top of the name contour
  const ringCenter = new Vector2(
    ring.lateralOffset,
    boundingBox.maxY - ring.innerDiameter / 2 - RING_EDGE_MARGIN + ring.radialOffset + ring.embedding,
  )

  const reinforcementShape = translatedShape(
    createReinforcementRing(ring),
    ringCenter.x,
    ringCenter.y,
  )
  const reinforcementGeometry = new ExtrudeGeometry(reinforcementShape, {
    depth: params.thickness,
    bevelEnabled: false,
  })

  // Merge outline with ring
  const mergedBase = mergeGeometries([outline, reinforcementGeometry]) ?? outline

  // Position fill on top of base
  fill.translate(0, 0, params.thickness - 0.01)

  return {
    base: mergedBase,
    text: fill,
    textItems: params.texts.map(t => ({ id: t.id, geometry: fill.clone() })),
    pieceBB: {
      minX: boundingBox.minX,
      maxX: boundingBox.maxX,
      minY: boundingBox.minY,
      maxY: boundingBox.maxY + ring.innerDiameter + RING_EDGE_MARGIN * 2,
    },
    hole: { x: ringCenter.x, y: ringCenter.y, radius: ring.innerDiameter / 2 },
  }
}
