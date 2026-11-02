import { BufferGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Evaluator, SUBTRACTION, Brush } from 'three-bvh-csg'
import { buildContentShapes, getUsableRegion, resolveContentGeometry } from './autoFit'
import { createNameOutline, unionShapes } from './nameOutline'
import { createBaseShape, createReinforcementRing, getRingPosition, type RingParams } from './shapes'
import type { BoundingBox2D, Circle2D } from './positioning'
import { RING_EDGE_MARGIN } from './schema'
import type { ContentItem, FontStyle, KeychainParams } from './schema'

export interface BuildKeychainInput {
  font?: Font
  fonts?: Partial<Record<FontStyle, Font>>
  params: KeychainParams
  onError?: (message: string) => void
}

export interface BuildContentItem {
  id: string
  halfWidth: number
  halfHeight: number
  geometry: BufferGeometry | null
}

export interface BuildKeychainResult {
  base: BufferGeometry
  content: BufferGeometry | null
  contentItems: BuildContentItem[]
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

function resolveFont(
  fonts: Partial<Record<FontStyle, Font>> | undefined,
  font: Font | undefined,
  style: FontStyle,
): Font {
  if (fonts?.[style]) return fonts[style]!
  if (font) return font
  throw new Error(`No font provided for style "${style}"`)
}

function mergeOrFirst(geometries: BufferGeometry[]): BufferGeometry {
  return mergeGeometries(geometries) ?? geometries[0] ?? new BufferGeometry()
}

function makeRingParams(params: KeychainParams): RingParams {
  return {
    position: params.ringPosition,
    innerDiameter: params.ringInnerDiameter,
    embedding: params.ringEmbedding,
    lateralOffset: params.ringLateralOffset,
    radialOffset: params.ringRadialOffset,
  }
}

function contentZ(params: KeychainParams): number {
  return params.textMode === 'raised'
    ? params.thickness - 0.01
    : params.thickness - params.reliefDepth + ENGRAVE_EPSILON
}

function computeBaseBB(geometry: BufferGeometry, hole: Circle2D): {
  pieceBB: BoundingBox2D
  hole: Circle2D
} {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  const pieceBB: BoundingBox2D = bb && Number.isFinite(bb.min.x)
    ? { minX: bb.min.x, maxX: bb.max.x, minY: bb.min.y, maxY: bb.max.y }
    : { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  return { pieceBB, hole }
}

function shapeBounds(shapes: Shape[]): BoundingBox2D | null {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  const includePoint = (p: Vector2): void => {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }

  for (const shape of shapes) {
    for (const point of shape.getPoints()) includePoint(point)
    for (const hole of shape.holes) {
      for (const point of hole.getPoints()) includePoint(point)
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null
  return { minX, maxX, minY, maxY }
}

function contentItemFromShapes(item: ContentItem, shapes: Shape[]): BuildContentItem {
  const bounds = shapeBounds(shapes)
  if (!bounds) return { id: item.id, halfWidth: 0, halfHeight: 0, geometry: null }
  return {
    id: item.id,
    halfWidth: (bounds.maxX - bounds.minX) / 2,
    halfHeight: (bounds.maxY - bounds.minY) / 2,
    geometry: null,
  }
}

function buildRegularKeychain({
  font,
  fonts,
  params,
  onError,
}: BuildKeychainInput): BuildKeychainResult {
  const ring = makeRingParams(params)
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

  const mergedBase = mergeOrFirst([baseGeometry, reinforcementGeometry])
  const hole: Circle2D = {
    x: ringCenter.x,
    y: ringCenter.y,
    radius: params.ringInnerDiameter / 2,
  }
  const { pieceBB } = computeBaseBB(mergedBase, hole)

  const region = getUsableRegion(params)
  const z = contentZ(params)
  const contentGeometries: BufferGeometry[] = []
  const contentItems: BuildContentItem[] = []

  for (const item of params.contents) {
    const itemFont = item.kind === 'text'
      ? resolveFont(fonts, font, item.fontStyle)
      : undefined
    const fitted = resolveContentGeometry(item, {
      region,
      params,
      font: itemFont,
      referenceSize: 10,
      pieceBB,
      hole,
    })

    if (!fitted) {
      contentItems.push({ id: item.id, halfWidth: 0, halfHeight: 0, geometry: null })
      continue
    }

    fitted.geometry.translate(fitted.x, fitted.y, z)
    contentItems.push({
      id: item.id,
      halfWidth: fitted.halfWidth,
      halfHeight: fitted.halfHeight,
      geometry: fitted.geometry,
    })
    contentGeometries.push(fitted.geometry)
  }

  const content = contentGeometries.length > 0
    ? mergeOrFirst(contentGeometries)
    : null

  if (params.textMode === 'raised') {
    mergedBase.computeVertexNormals()
    content?.computeVertexNormals()
    return { base: mergedBase, content, contentItems, pieceBB, hole }
  }

  if (!content) {
    mergedBase.computeVertexNormals()
    return { base: mergedBase, content: null, contentItems, pieceBB, hole }
  }

  try {
    const evaluator = new Evaluator()
    const result = evaluator.evaluate(new Brush(mergedBase), new Brush(content), SUBTRACTION)
    result.geometry.computeVertexNormals()
    return { base: result.geometry, content, contentItems, pieceBB, hole }
  } catch {
    onError?.('Falha na gravação; usando relevo')
    content.translate(0, 0, params.thickness - 0.01 - z)
    content.computeVertexNormals()
    mergedBase.computeVertexNormals()
    return { base: mergedBase, content, contentItems, pieceBB, hole }
  }
}

function buildNameKeychain({
  font,
  fonts,
  params,
  onError,
}: BuildKeychainInput): BuildKeychainResult {
  const textReference = params.contents.find(item => item.kind === 'text')
  const referenceSize = textReference?.kind === 'text' ? textReference.fontSize : 10

  const allShapes: Shape[] = []
  const contentItems: BuildContentItem[] = []

  for (const item of params.contents) {
    const itemFont = item.kind === 'text'
      ? resolveFont(fonts, font, item.fontStyle)
      : undefined
    const shapes = buildContentShapes(item, itemFont, referenceSize)
    allShapes.push(...shapes)
    contentItems.push(contentItemFromShapes(item, shapes))
  }

  const { outline, boundingBox } = createNameOutline({
    shapes: allShapes,
    borderWidth: params.borderWidth,
    thickness: params.thickness,
  })

  const ring = makeRingParams(params)
  const ringCenter = new Vector2(
    ring.lateralOffset,
    boundingBox.maxY - params.ringInnerDiameter / 2 - RING_EDGE_MARGIN
      + ring.radialOffset + ring.embedding,
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
  const hole: Circle2D = {
    x: ringCenter.x,
    y: ringCenter.y,
    radius: params.ringInnerDiameter / 2,
  }

  const contentShapes = unionShapes(allShapes)
  const content = contentShapes.length > 0
    ? mergeOrFirst(contentShapes.map(shape => new ExtrudeGeometry(shape, {
        depth: params.reliefDepth,
        bevelEnabled: false,
      })))
    : null

  const z = contentZ(params)

  if (params.textMode === 'raised') {
    const base = mergeOrFirst([outline, reinforcementGeometry])
    content?.translate(0, 0, z)
    content?.computeVertexNormals()
    base.computeVertexNormals()
    return { base, content, contentItems, ...computeBaseBB(base, hole) }
  }

  const base = mergeOrFirst([outline, reinforcementGeometry])

  if (!content) {
    base.computeVertexNormals()
    return { base, content: null, contentItems, ...computeBaseBB(base, hole) }
  }

  content.translate(0, 0, z)

  try {
    const evaluator = new Evaluator()
    const result = evaluator.evaluate(new Brush(base), new Brush(content), SUBTRACTION)
    result.geometry.computeVertexNormals()
    return { base: result.geometry, content, contentItems, ...computeBaseBB(result.geometry, hole) }
  } catch {
    onError?.('Falha na gravação; usando relevo')
    content.translate(0, 0, params.thickness - 0.01 - z)
    content.computeVertexNormals()
    base.computeVertexNormals()
    return { base, content, contentItems, ...computeBaseBB(base, hole) }
  }
}

export function buildKeychain(input: BuildKeychainInput): BuildKeychainResult {
  if (input.params.baseShape === 'name') {
    return buildNameKeychain(input)
  }
  return buildRegularKeychain(input)
}
