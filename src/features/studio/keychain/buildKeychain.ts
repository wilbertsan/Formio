import { type BufferGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Evaluator, SUBTRACTION, Brush } from 'three-bvh-csg'
import { createBaseShape, createReinforcementRing, getRingPosition, type RingParams } from './shapes'
import { nameToGeometry } from './textToGeometry'
import { defaultStackOffsets, type BoundingBox2D, type Circle2D } from './positioning'
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
  const ring: RingParams = {
    position: params.ringPosition,
    innerDiameter: params.ringInnerDiameter,
    embedding: params.ringEmbedding,
    lateralOffset: params.ringLateralOffset,
    radialOffset: params.ringRadialOffset,
  }
  const baseShape = createBaseShape(params.baseShape, params.width, params.width, ring)

  const baseGeometry = new ExtrudeGeometry(baseShape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 1,
  })

  const ringCenter = getRingPosition(params.baseShape, params.width, params.width, ring)
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

  const heights = params.texts.map((t) => t.height)
  const baseYs = defaultStackOffsets(heights)

  const textGeometries: BufferGeometry[] = []
  const textItems: Array<{ id: string; geometry: BufferGeometry }> = []

  for (let i = 0; i < params.texts.length; i++) {
    const item = params.texts[i]
    const resolvedFont = resolveFont(fonts, font, item.fontStyle)
    const textGeometry = buildItemGeometry(item, resolvedFont, availableWidth)
    textGeometry.translate(item.offsetX, baseYs[i] + item.offsetY, params.thickness - 0.01)
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
