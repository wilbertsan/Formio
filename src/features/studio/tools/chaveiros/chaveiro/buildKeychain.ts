import { BufferGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buildContentShapes, getUsableRegion, resolveContentGeometry } from './autoFit'
import { createNameOutline, expandShape, subtractShapes, unionShapes } from './nameOutline'
import {
  createBaseShape,
  createReinforcementRing,
  getClampedRingPosition,
  type RingParams,
} from './shapes'
import type { BoundingBox2D, Circle2D } from './positioning'
import { CONTENT_DEPTH, RING_EDGE_MARGIN } from './schema'
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

const REGULAR_SURFACE_TOP = 0.2

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

function mergeOrFirst(
  geometries: BufferGeometry[],
  onError?: (message: string) => void,
): BufferGeometry {
  const merged = mergeGeometries(geometries)
  if (merged) return merged
  onError?.('Falha ao combinar geometrias')
  return geometries[0] ?? new BufferGeometry()
}

function disposeAll(geometries: BufferGeometry[], keep?: BufferGeometry): void {
  for (const geometry of geometries) {
    if (geometry !== keep) geometry.dispose()
  }
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

function contentZ(surfaceTop: number): number {
  return surfaceTop - 0.01
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

function nameRingCenter(bbox: BoundingBox2D, ring: RingParams): Vector2 {
  const radius = ring.innerDiameter / 2
  const offset = RING_EDGE_MARGIN + radius + ring.radialOffset - ring.embedding
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2
  const maxLateralX = Math.max(0, (bbox.maxX - bbox.minX) / 2 - radius)
  const maxLateralY = Math.max(0, (bbox.maxY - bbox.minY) / 2 - radius)
  const isVertical = ring.position === 'top' || ring.position === 'bottom'
  const lateral = isVertical
    ? Math.min(maxLateralX, Math.max(-maxLateralX, ring.lateralOffset))
    : Math.min(maxLateralY, Math.max(-maxLateralY, ring.lateralOffset))
  switch (ring.position) {
    case 'top': return new Vector2(cx + lateral, bbox.maxY + offset)
    case 'bottom': return new Vector2(cx + lateral, bbox.minY - offset)
    case 'left': return new Vector2(bbox.minX - offset, cy + lateral)
    case 'right': return new Vector2(bbox.maxX + offset, cy + lateral)
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

  const ringCenter = getClampedRingPosition(
    params.baseShape,
    params.width,
    params.height,
    ring,
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

  const mergedBase = mergeOrFirst([baseGeometry, reinforcementGeometry], onError)
  disposeAll([baseGeometry, reinforcementGeometry], mergedBase)

  const hole: Circle2D = {
    x: ringCenter.x,
    y: ringCenter.y,
    radius: params.ringInnerDiameter / 2,
  }
  const { pieceBB } = computeBaseBB(mergedBase, hole)

  const surfaceTop = params.thickness + REGULAR_SURFACE_TOP
  const region = getUsableRegion(params)
  const z = contentZ(surfaceTop)
  const contentGeometries: BufferGeometry[] = []
  const contentItems: BuildContentItem[] = []

  for (const item of params.contents) {
    const itemFont = item.kind === 'text' && item.content.trim()
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
    ? mergeOrFirst(contentGeometries, onError)
    : null
  disposeAll(contentGeometries, content ?? undefined)
  for (const item of contentItems) item.geometry = null

  mergedBase.computeVertexNormals()
  content?.computeVertexNormals()
  return { base: mergedBase, content, contentItems, pieceBB, hole }
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
    const itemFont = item.kind === 'text' && item.content.trim()
      ? resolveFont(fonts, font, item.fontStyle)
      : undefined
    const shapes = buildContentShapes(item, itemFont, referenceSize)
    allShapes.push(...shapes)
    contentItems.push(contentItemFromShapes(item, shapes))
  }

  if (allShapes.length === 0) {
    onError?.('Sem conteúdo válido para o formato nome')
  }

  const contentBB: BoundingBox2D = shapeBounds(allShapes)
    ?? { minX: 0, maxX: 0, minY: 0, maxY: 0 }

  const ring = makeRingParams(params)
  const radius = ring.innerDiameter / 2
  const ringCenter = nameRingCenter(contentBB, ring)

  const holeShape = new Shape()
  holeShape.absarc(ringCenter.x, ringCenter.y, radius, 0, Math.PI * 2, false)
  const expandedShapes = unionShapes(allShapes)
    .flatMap(shape => expandShape(shape, params.borderWidth))
  const shapesWithHole = expandedShapes.flatMap(shape => subtractShapes(shape, holeShape))

  const { outline } = createNameOutline({
    shapes: shapesWithHole,
    borderWidth: 0,
    thickness: params.thickness,
  })

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
    radius,
  }

  const contentShapesWithHole = unionShapes(allShapes)
    .flatMap(shape => subtractShapes(shape, holeShape))
  const contentGeometries = contentShapesWithHole.map(shape => new ExtrudeGeometry(shape, {
    depth: CONTENT_DEPTH,
    bevelEnabled: false,
  }))
  const content = contentGeometries.length > 0
    ? mergeOrFirst(contentGeometries, onError)
    : null
  disposeAll(contentGeometries, content ?? undefined)

  const base = mergeOrFirst([outline, reinforcementGeometry], onError)
  disposeAll([outline, reinforcementGeometry], base)

  const surfaceTop = params.thickness
  const z = contentZ(surfaceTop)

  content?.translate(0, 0, z)
  base.computeVertexNormals()
  content?.computeVertexNormals()
  return { base, content, contentItems, ...computeBaseBB(base, hole) }
}

export function buildKeychain(input: BuildKeychainInput): BuildKeychainResult {
  if (input.params.baseShape === 'name') {
    return buildNameKeychain(input)
  }
  return buildRegularKeychain(input)
}
