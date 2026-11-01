import { type BufferGeometry, Path, Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import {
  buildSvgIconGeometry,
  buildSvgIconGeometryInBox,
  parseSvg,
  scaleShape,
  svgBoundsFromParsed,
  svgShapesFromParsed,
  type ParsedSvg,
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
  font?: Font
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
    const xs = points.map(point => point.x)
    const ys = points.map(point => point.y)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
    const inset = Math.min(...points.map(point => Math.hypot(point.x - cx, point.y - cy)))
    return {
      kind: 'circle',
      cx,
      cy,
      radius: Math.max(1, inset - params.borderWidth),
    }
  }

  const halfWidth = Math.max(0.5, params.width / 2 - params.borderWidth)
  const halfHeight = Math.max(0.5, params.height / 2 - params.borderWidth)
  return {
    kind: 'rect',
    minX: -halfWidth,
    maxX: halfWidth,
    minY: -halfHeight,
    maxY: halfHeight,
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

  const centerX = (fitted.min.x + fitted.max.x) / 2
  const centerY = (fitted.min.y + fitted.max.y) / 2
  const targetX = region.kind === 'circle' ? region.cx : 0
  const targetY = region.kind === 'circle' ? region.cy : 0

  geometry.translate(targetX - centerX, targetY - centerY, -fitted.min.z)
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
  const dx = offset.x - region.cx
  const dy = offset.y - region.cy
  const distance = Math.hypot(dx, dy)
  if (distance <= maxCenter || distance === 0) {
    return { x: offset.x, y: offset.y }
  }

  const scale = maxCenter / distance
  return { x: region.cx + dx * scale, y: region.cy + dy * scale }
}

export function resolveContentGeometry(
  item: ContentItem,
  ctx: FitContext,
): FittedContent | null {
  if (item.kind === 'text') {
    if (!ctx.font) return null

    const geometry = nameToGeometry({
      font: ctx.font,
      name: item.content,
      size: item.fontSize,
      depth: ctx.params.reliefDepth,
    })
    normalizeZ(geometry)
    if (ctx.region) fitGeometryToRegion(geometry, ctx.region)
    return fittedContent(geometry, item, ctx)
  }

  const svg = item.svgIcon
  if (svg === null) return null

  const region = ctx.region
  let geometry: BufferGeometry | null
  if (region?.kind === 'circle') {
    const radius = region.radius
    geometry = safeIconGeometry(() => buildSvgIconGeometry({
      svg,
      maxRadius: radius,
      lineWidth: item.iconLineWidth,
      iconScale: item.iconScale,
      depth: ctx.params.reliefDepth,
    }))
  } else if (region?.kind === 'rect') {
    const maxWidth = region.maxX - region.minX
    const maxHeight = region.maxY - region.minY
    geometry = safeIconGeometry(() => buildSvgIconGeometryInBox({
      svg,
      maxWidth,
      maxHeight,
      lineWidth: item.iconLineWidth,
      iconScale: item.iconScale,
      depth: ctx.params.reliefDepth,
    }))
  } else {
    geometry = safeIconGeometry(() => buildSvgIconGeometryInBox({
      svg,
      maxWidth: ctx.referenceSize * 2,
      maxHeight: ctx.referenceSize * 2,
      lineWidth: item.iconLineWidth,
      iconScale: item.iconScale,
      depth: ctx.params.reliefDepth,
    }))
  }

  if (!geometry) return null
  normalizeZ(geometry)
  if (ctx.region) fitGeometryToRegion(geometry, ctx.region)
  return fittedContent(geometry, item, ctx)
}

export function buildContentShapes(
  item: ContentItem,
  font: Font,
  referenceSize: number,
): Shape[] {
  if (item.kind === 'text') {
    const shapes = font.generateShapes(normalizeName(item.content), item.fontSize)
    return centerShapes(shapes, item.offsetX, item.offsetY)
  }

  if (item.svgIcon === null) return []

  const parsed = safeParseSvg(item.svgIcon)
  if (!parsed) return []

  const bounds = svgBoundsFromParsed(parsed)
  if (!bounds || bounds.farthest <= 0) return []

  const scale = (referenceSize / bounds.farthest) * item.iconScale
  if (scale <= 0) return []

  const shapes = svgShapesFromParsed(parsed, item.iconLineWidth / scale)
    .map(shape => rotateShape180(scaleShape(shape, scale)))

  return centerShapes(shapes, item.offsetX, item.offsetY)
}

function ratio(available: number, size: number): number {
  return size > 0 ? available / size : Infinity
}

function normalizeZ(geometry: BufferGeometry): void {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  if (bb) geometry.translate(0, 0, -bb.min.z)
}

function safeParseSvg(svg: string): ParsedSvg | null {
  try {
    return parseSvg(svg)
  } catch {
    return null
  }
}

function safeIconGeometry(
  create: () => BufferGeometry | null,
): BufferGeometry | null {
  try {
    return create()
  } catch {
    return null
  }
}

function shapesBounds(shapes: Shape[]): BoundingBox2D | null {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const shape of shapes) {
    for (const point of shape.getPoints()) {
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    }
    for (const hole of shape.holes) {
      for (const point of hole.getPoints()) {
        minX = Math.min(minX, point.x)
        maxX = Math.max(maxX, point.x)
        minY = Math.min(minY, point.y)
        maxY = Math.max(maxY, point.y)
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null
  return { minX, maxX, minY, maxY }
}

function centerShapes(shapes: Shape[], offsetX: number, offsetY: number): Shape[] {
  const bounds = shapesBounds(shapes)
  if (!bounds) return shapes.map(shape => translateShape(shape, offsetX, offsetY))

  const dx = -(bounds.minX + bounds.maxX) / 2 + offsetX
  const dy = -(bounds.minY + bounds.maxY) / 2 + offsetY
  return shapes.map(shape => translateShape(shape, dx, dy))
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
