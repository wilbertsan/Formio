import { type BufferGeometry, Path, Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import {
  buildSvgIconGeometry,
  buildSvgIconGeometryInBox,
  parseSvg,
  scaleShape,
  svgBoundsFromParsed,
  svgShapesFromParsed,
} from '../../confeitaria/shared/svgToIconShape'
import { clampTextPosition, type BoundingBox2D, type Circle2D } from './positioning'
import { normalizeName, type ContentItem, type KeychainParams } from './schema'
import { createOutline } from './shapes'
import { nameToGeometry } from './textToGeometry'

export type UsableRegion =
  | { kind: 'rect'; minX: number; maxX: number; minY: number; maxY: number }
  | { kind: 'circle'; cx: number; cy: number; radius: number }

export interface FitContext {
  region: UsableRegion | null
  params: KeychainParams
  font: Font
  referenceSize: number
  pieceBB?: BoundingBox2D
  hole?: Circle2D
}

export interface FittedContent {
  geometry: BufferGeometry
  halfWidth: number
  halfHeight: number
  x: number
  y: number
}

export function getUsableRegion(params: KeychainParams): UsableRegion | null {
  if (params.baseShape === 'name') return null

  if (params.baseShape === 'circle') {
    return {
      kind: 'circle',
      cx: 0,
      cy: 0,
      radius: Math.max(1, params.width / 2 - params.borderWidth),
    }
  }

  if (params.baseShape === 'heart') {
    const points = createOutline('heart', params.width, params.height).getPoints(64)
    const inset = Math.min(...points.map(point => Math.hypot(point.x, point.y)))
    return {
      kind: 'circle',
      cx: 0,
      cy: 0,
      radius: Math.max(1, inset - params.borderWidth),
    }
  }

  return {
    kind: 'rect',
    minX: -params.width / 2 + params.borderWidth,
    maxX: params.width / 2 - params.borderWidth,
    minY: -params.height / 2 + params.borderWidth,
    maxY: params.height / 2 - params.borderWidth,
  }
}

export function fitGeometryToRegion(geometry: BufferGeometry, region: UsableRegion): void {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  if (!bb) return

  const width = bb.max.x - bb.min.x
  const height = bb.max.y - bb.min.y

  const scale = region.kind === 'rect'
    ? Math.min(
      1,
      ratio(region.maxX - region.minX, width),
      ratio(region.maxY - region.minY, height),
    )
    : Math.min(1, ratio(2 * region.radius, Math.hypot(width, height)))

  if (scale < 1) {
    geometry.scale(scale, scale, 1)
    geometry.computeBoundingBox()
  }

  const fitted = geometry.boundingBox
  if (!fitted) return
  geometry.translate(
    -(fitted.min.x + fitted.max.x) / 2,
    -(fitted.min.y + fitted.max.y) / 2,
    -fitted.min.z,
  )
}

export function clampOffset(
  region: UsableRegion | null,
  halfWidth: number,
  halfHeight: number,
  offset: { x: number; y: number },
): { x: number; y: number } {
  if (!region) return { x: offset.x, y: offset.y }

  if (region.kind === 'rect') {
    return {
      x: Math.min(region.maxX - halfWidth, Math.max(region.minX + halfWidth, offset.x)),
      y: Math.min(region.maxY - halfHeight, Math.max(region.minY + halfHeight, offset.y)),
    }
  }

  const maxCenter = Math.max(0, region.radius - Math.hypot(halfWidth, halfHeight))
  const distance = Math.hypot(offset.x, offset.y)
  if (distance <= maxCenter || distance === 0) {
    return { x: offset.x, y: offset.y }
  }

  const scale = maxCenter / distance
  return { x: offset.x * scale, y: offset.y * scale }
}

export function resolveContentGeometry(
  item: ContentItem,
  ctx: FitContext,
): FittedContent | null {
  if (item.kind === 'text') {
    const geometry = nameToGeometry({
      font: ctx.font,
      name: item.content,
      size: item.fontSize,
      depth: ctx.params.reliefDepth,
    })
    if (ctx.region) fitGeometryToRegion(geometry, ctx.region)
    return fittedContent(geometry, item, ctx)
  }

  if (item.svgIcon === null) return null

  let geometry: BufferGeometry | null
  if (ctx.region?.kind === 'circle') {
    geometry = buildSvgIconGeometry({
      svg: item.svgIcon,
      maxRadius: ctx.region.radius,
      lineWidth: item.iconLineWidth,
      iconScale: item.iconScale,
      depth: ctx.params.reliefDepth,
    })
  } else if (ctx.region?.kind === 'rect') {
    geometry = buildSvgIconGeometryInBox({
      svg: item.svgIcon,
      maxWidth: ctx.region.maxX - ctx.region.minX,
      maxHeight: ctx.region.maxY - ctx.region.minY,
      lineWidth: item.iconLineWidth,
      iconScale: item.iconScale,
      depth: ctx.params.reliefDepth,
    })
  } else {
    geometry = buildSvgIconGeometryInBox({
      svg: item.svgIcon,
      maxWidth: ctx.referenceSize * 2,
      maxHeight: ctx.referenceSize * 2,
      lineWidth: item.iconLineWidth,
      iconScale: item.iconScale,
      depth: ctx.params.reliefDepth,
    })
  }

  if (!geometry) return null
  if (ctx.region) fitGeometryToRegion(geometry, ctx.region)
  return fittedContent(geometry, item, ctx)
}

export function buildContentShapes(
  item: ContentItem,
  font: Font,
  referenceSize: number,
): Shape[] {
  if (item.kind === 'text') {
    return font
      .generateShapes(normalizeName(item.content), item.fontSize)
      .map(shape => translateShape(shape, item.offsetX, item.offsetY))
  }

  if (item.svgIcon === null) return []

  const parsed = parseSvg(item.svgIcon)
  if (!parsed) return []

  const bounds = svgBoundsFromParsed(parsed)
  if (!bounds || bounds.farthest <= 0) return []

  const scale = (referenceSize / bounds.farthest) * item.iconScale
  if (scale <= 0) return []

  return svgShapesFromParsed(parsed, item.iconLineWidth / scale)
    .map(shape => rotateShape180(scaleShape(shape, scale)))
    .map(shape => translateShape(shape, item.offsetX, item.offsetY))
}

function ratio(available: number, size: number): number {
  return size > 0 ? available / size : Infinity
}

function fittedContent(
  geometry: BufferGeometry,
  item: ContentItem,
  ctx: FitContext,
): FittedContent {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  const halfWidth = bb ? (bb.max.x - bb.min.x) / 2 : 0
  const halfHeight = bb ? (bb.max.y - bb.min.y) / 2 : 0

  const position = placeContent(item, halfWidth, halfHeight, ctx)
  return { geometry, halfWidth, halfHeight, x: position.x, y: position.y }
}

function placeContent(
  item: ContentItem,
  halfWidth: number,
  halfHeight: number,
  ctx: FitContext,
): { x: number; y: number } {
  let offset = clampOffset(ctx.region, halfWidth, halfHeight, {
    x: item.offsetX,
    y: item.offsetY,
  })

  if (ctx.pieceBB && ctx.hole) {
    offset = clampTextPosition(
      { ...offset, halfWidth, halfHeight },
      ctx.pieceBB,
      ctx.hole,
    )
    offset = clampOffset(ctx.region, halfWidth, halfHeight, offset)
  }

  return offset
}

function translateShape(shape: Shape, x: number, y: number): Shape {
  const points = shape.getPoints()
  const translated = new Shape(points.map(point => new Vector2(point.x + x, point.y + y)))
  for (const hole of shape.holes) {
    const holePoints = hole.getPoints()
    translated.holes.push(
      new Path(holePoints.map(point => new Vector2(point.x + x, point.y + y))),
    )
  }
  return translated
}

function rotateShape180(shape: Shape): Shape {
  const points = shape.getPoints()
  const rotated = new Shape(points.map(point => new Vector2(-point.x, -point.y)))
  for (const hole of shape.holes) {
    const holePoints = hole.getPoints()
    rotated.holes.push(new Path(holePoints.map(point => new Vector2(-point.x, -point.y))))
  }
  return rotated
}
