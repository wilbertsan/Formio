import { type BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import {
  buildSvgIconGeometryInBoxFromParsed,
  parseSvg,
  type ParsedSvg,
} from '../../confeitaria/shared/svgToIconShape'
import {
  CONTENT_DEPTH,
  CONTENT_MARGIN,
  type PhotoStandContent,
  type PhotoStandParams,
} from './schema'
import { getStandWidth } from './shapes'
import { textToGeometry } from './textToGeometry'

export interface RectRegion {
  kind: 'rect'
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface FitContext {
  region: RectRegion
  font?: Font
}

export interface FittedContent {
  geometry: BufferGeometry
  halfWidth: number
  halfHeight: number
  x: number
  y: number
}

/** Área útil da faixa frontal: largura da peça × altura da faixa, menos 3 mm. */
export function getUsableRegion(params: PhotoStandParams): RectRegion {
  const halfWidth = Math.max(0.5, getStandWidth(params) / 2 - CONTENT_MARGIN)
  const halfHeight = Math.max(0.5, params.bandHeight / 2 - CONTENT_MARGIN)
  return { kind: 'rect', minX: -halfWidth, maxX: halfWidth, minY: -halfHeight, maxY: halfHeight }
}

export function fitGeometryToRegion(geometry: BufferGeometry, region: RectRegion): void {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  if (!bb) return

  const width = bb.max.x - bb.min.x
  const height = bb.max.y - bb.min.y
  const scale = Math.min(
    1,
    ratio(region.maxX - region.minX, width),
    ratio(region.maxY - region.minY, height),
  )

  if (scale < 1) {
    geometry.scale(scale, scale, 1)
    geometry.computeBoundingBox()
  }

  const fitted = geometry.boundingBox
  if (!fitted) return

  const centerX = (fitted.min.x + fitted.max.x) / 2
  const centerY = (fitted.min.y + fitted.max.y) / 2
  geometry.translate(-centerX, -centerY, -fitted.min.z)
}

export function clampOffset(
  region: RectRegion,
  halfWidth: number,
  halfHeight: number,
  offset: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: Math.min(region.maxX - halfWidth, Math.max(region.minX + halfWidth, offset.x)),
    y: Math.min(region.maxY - halfHeight, Math.max(region.minY + halfHeight, offset.y)),
  }
}

export function resolveContentGeometry(
  item: PhotoStandContent,
  ctx: FitContext,
  parsedSvg?: ParsedSvg | null,
): FittedContent | null {
  if (item.kind === 'text') {
    if (!item.content.trim() || !ctx.font) return null
    const geometry = textToGeometry({
      font: ctx.font,
      text: item.content,
      size: item.fontSize,
      depth: CONTENT_DEPTH,
    })
    normalizeDepth(geometry, CONTENT_DEPTH)
    fitGeometryToRegion(geometry, ctx.region)
    return fittedContent(geometry, item, ctx.region)
  }

  const parsed = resolveParsedSvg(item, parsedSvg)
  if (!parsed) return null

  const geometry = safeIconGeometry(() => buildSvgIconGeometryInBoxFromParsed(parsed, {
    maxWidth: ctx.region.maxX - ctx.region.minX,
    maxHeight: ctx.region.maxY - ctx.region.minY,
    lineWidth: item.iconLineWidth,
    iconScale: item.iconScale,
    depth: CONTENT_DEPTH,
  }))
  if (!geometry) return null

  normalizeDepth(geometry, CONTENT_DEPTH)
  fitGeometryToRegion(geometry, ctx.region)
  return fittedContent(geometry, item, ctx.region)
}

function ratio(available: number, size: number): number {
  return size > 0 ? available / size : Infinity
}

/**
 * Normaliza a espessura final em Z. O builder de ícones aplica bevel e pode
 * entregar mais que a profundidade nominal; o texto já sai com a profundidade
 * exata. Garante o relevo fixo de 1 mm para os dois tipos.
 */
function normalizeDepth(geometry: BufferGeometry, depth: number): void {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  if (!bb) return

  const current = bb.max.z - bb.min.z
  if (current <= 0) return

  const scale = depth / current
  if (Math.abs(scale - 1) > 1e-6) {
    geometry.scale(1, 1, scale)
    geometry.computeBoundingBox()
  }

  const scaled = geometry.boundingBox
  if (scaled) geometry.translate(0, 0, -scaled.min.z)
}

function resolveParsedSvg(
  item: Extract<PhotoStandContent, { kind: 'icon' }>,
  parsedSvg: ParsedSvg | null | undefined,
): ParsedSvg | null {
  if (parsedSvg === null) return null
  if (parsedSvg) return parsedSvg
  if (!item.svgIcon) return null
  try {
    return parseSvg(item.svgIcon)
  } catch {
    return null
  }
}

function safeIconGeometry(create: () => BufferGeometry | null): BufferGeometry | null {
  try {
    return create()
  } catch {
    return null
  }
}

function fittedContent(
  geometry: BufferGeometry,
  item: PhotoStandContent,
  region: RectRegion,
): FittedContent {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  const halfWidth = bb ? (bb.max.x - bb.min.x) / 2 : 0
  const halfHeight = bb ? (bb.max.y - bb.min.y) / 2 : 0
  const position = clampOffset(region, halfWidth, halfHeight, {
    x: item.offsetX,
    y: item.offsetY,
  })
  return { geometry, halfWidth, halfHeight, x: position.x, y: position.y }
}
