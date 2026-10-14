import { type BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import {
  type ClipperPoint,
  offsetPaths,
  outerPaths,
  pathsBoundingBox,
  pathsToShapes,
  scalePaths,
  shapesToGeometry,
  subtractPaths,
  textToShapes,
  toClipperPaths,
  translatePaths,
  unionPaths,
} from '../shared/textOutline'
import { parseSvg, svgBoundsFromParsed, svgShapesFromParsed, type ParsedSvg } from '../shared/svgToIconShape'
import {
  type CutterStampParams,
  CLEARANCE_MM,
  HANDLE_HEIGHT_RATIO,
  HANDLE_RADIUS_RATIO,
  MAX_SHAPE_WIDTH_MM,
  PIECE_GAP_MM,
} from './schema'

export interface BuildCutterStampInput {
  params: CutterStampParams
  font: Font | null
  /** SVG já achatado (main thread). No worker é obrigatório no modo SVG. */
  parsedSvg?: ParsedSvg | null
}

export interface BuildCutterStampResult {
  cutter: BufferGeometry
  stampBase: BufferGeometry
  stampRelief: BufferGeometry
  stampHandle: BufferGeometry
}

// Contornos da forma (texto ou ícone SVG) unidos, reduzidos para caber na
// largura máxima e centralizados na origem.
function buildShapePaths(params: CutterStampParams, font: Font | null, parsedSvg?: ParsedSvg | null): ClipperPoint[][] {
  if (params.contentType === 'svg') {
    // `parseSvg` usa DOMParser (só na main thread). No worker, `parsedSvg` já vem pronto.
    const parsed = parsedSvg ?? (params.svgIcon ? parseSvg(params.svgIcon) : null)
    if (!parsed) return []
    const bounds = svgBoundsFromParsed(parsed)
    if (!bounds || bounds.height <= 0) return []

    const scale = (params.textHeight * params.iconScale) / bounds.height
    if (scale <= 0) return []

    let paths = unionPaths(toClipperPaths(svgShapesFromParsed(parsed, params.iconLineWidth / scale)))
    if (paths.length === 0) return []

    paths = scalePaths(paths, scale)
    // O SVGLoader entrega Y para baixo; 180° em Z corrige a orientação.
    paths = scalePaths(paths, -1)

    const wide = pathsBoundingBox(paths)
    if (wide.width > MAX_SHAPE_WIDTH_MM) {
      paths = scalePaths(paths, MAX_SHAPE_WIDTH_MM / wide.width)
    }

    const fitted = pathsBoundingBox(paths)
    return translatePaths(paths, -(fitted.minX + fitted.maxX) / 2, -(fitted.minY + fitted.maxY) / 2)
  }

  if (!font) return []

  const shapes = textToShapes(font, params.text, params.textHeight)
  let paths = unionPaths(toClipperPaths(shapes))
  if (paths.length === 0) return paths

  const bounds = pathsBoundingBox(paths)
  if (bounds.width > MAX_SHAPE_WIDTH_MM) {
    paths = scalePaths(paths, MAX_SHAPE_WIDTH_MM / bounds.width)
  }

  const fitted = pathsBoundingBox(paths)
  return translatePaths(paths, -(fitted.minX + fitted.maxX) / 2, -(fitted.minY + fitted.maxY) / 2)
}

function createCircleShape(radius: number): Shape {
  const shape = new Shape()
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
  return shape
}

// Centraliza as geometrias em X/Y e devolve a meia-largura (para o layout).
function centerPiece(geometries: BufferGeometry[]): { halfWidth: number } {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const geometry of geometries) {
    geometry.computeBoundingBox()
    const bb = geometry.boundingBox!
    minX = Math.min(minX, bb.min.x)
    maxX = Math.max(maxX, bb.max.x)
    minY = Math.min(minY, bb.min.y)
    maxY = Math.max(maxY, bb.max.y)
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  for (const geometry of geometries) {
    geometry.translate(-cx, -cy, 0)
  }

  return { halfWidth: (maxX - minX) / 2 }
}

export function buildCutterStamp({ params, font, parsedSvg }: BuildCutterStampInput): BuildCutterStampResult {
  const shape = buildShapePaths(params, font, parsedSvg)
  const bounds = pathsBoundingBox(shape)

  // Abertura única (mantém furos), reaproveitada pela base do carimbo.
  const fullOpening = offsetPaths(shape, params.baseMargin)
  // Para o cortador, só o contorno externo: peça única, sem paredes internas.
  const opening = outerPaths(fullOpening)

  // Cortador: parede (stroke) em volta da abertura.
  const ring = subtractPaths(offsetPaths(opening, params.wallThickness), opening)
  const cutter = shapesToGeometry(pathsToShapes(ring), params.wallHeight, false)

  // Base única do carimbo: abertura com folga, para encaixar no corte.
  const basePaths = offsetPaths(fullOpening, -CLEARANCE_MM)
  const baseThickness = (params.stampHeight - params.reliefHeight) * (1 - HANDLE_HEIGHT_RATIO)
  const stampBase = shapesToGeometry(pathsToShapes(basePaths), baseThickness, false)
  stampBase.translate(0, 0, params.reliefHeight)

  // Relevo: forma preenchida em alto relevo na face de contato.
  const stampRelief = shapesToGeometry(pathsToShapes(shape), params.reliefHeight, false)

  // Cabo: cilindro central sobre a base.
  const handleRadius = Math.max(1, bounds.height * HANDLE_RADIUS_RATIO)
  const handleHeight = (params.stampHeight - params.reliefHeight) * HANDLE_HEIGHT_RATIO
  const stampHandle = new ExtrudeGeometry(createCircleShape(handleRadius), {
    depth: handleHeight,
    bevelEnabled: false,
  })
  stampHandle.translate(0, 0, params.reliefHeight + baseThickness)

  // Layout lado a lado.
  const cutterBounds = centerPiece([cutter])
  const stampGeometries = [stampBase, stampRelief, stampHandle]
  const stampBounds = centerPiece(stampGeometries)

  cutter.translate(-(cutterBounds.halfWidth + PIECE_GAP_MM / 2), 0, 0)
  for (const geometry of stampGeometries) {
    geometry.translate(stampBounds.halfWidth + PIECE_GAP_MM / 2, 0, 0)
  }

  return { cutter, stampBase, stampRelief, stampHandle }
}
