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
import {
  type CutterStampParams,
  CLEARANCE_MM,
  HANDLE_HEIGHT_RATIO,
  HANDLE_RADIUS_RATIO,
  MAX_TEXT_WIDTH_MM,
  PIECE_GAP_MM,
} from './schema'

export interface BuildCutterStampInput {
  params: CutterStampParams
  font: Font
}

export interface BuildCutterStampResult {
  cutter: BufferGeometry
  stampBase: BufferGeometry
  stampRelief: BufferGeometry
  stampHandle: BufferGeometry
}

// Contornos do texto já unidos, reduzidos para caber na largura máxima e
// centralizados na origem.
function buildTextPaths(params: CutterStampParams, font: Font): ClipperPoint[][] {
  const shapes = textToShapes(font, params.text, params.textHeight)
  let paths = unionPaths(toClipperPaths(shapes))
  if (paths.length === 0) return paths

  const bounds = pathsBoundingBox(paths)
  if (bounds.width > MAX_TEXT_WIDTH_MM) {
    paths = scalePaths(paths, MAX_TEXT_WIDTH_MM / bounds.width)
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

export function buildCutterStamp({ params, font }: BuildCutterStampInput): BuildCutterStampResult {
  const text = buildTextPaths(params, font)
  const bounds = pathsBoundingBox(text)

  // Abertura do cortador: contorno da palavra com margem (une as letras).
  // Sem furos internos (counters): o cortador é uma peça única, sem paredes
  // separadas em volta dos furos das letras.
  const opening = outerPaths(offsetPaths(text, params.baseMargin))

  // Cortador: parede (stroke) em volta da abertura (só o contorno externo).
  const ring = subtractPaths(offsetPaths(opening, params.wallThickness), opening)
  const cutter = shapesToGeometry(pathsToShapes(ring), params.wallHeight, false)

  // Base única do carimbo: abertura com folga, para encaixar no corte.
  const basePaths = offsetPaths(text, params.baseMargin - CLEARANCE_MM)
  const baseThickness = (params.stampHeight - params.reliefHeight) * (1 - HANDLE_HEIGHT_RATIO)
  const stampBase = shapesToGeometry(pathsToShapes(basePaths), baseThickness, false)
  stampBase.translate(0, 0, params.reliefHeight)

  // Relevo: texto preenchido em alto relevo na face de contato.
  const stampRelief = shapesToGeometry(pathsToShapes(text), params.reliefHeight, false)

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
