import { type BufferGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import ClipperLib from 'js-clipper'
import { clipperPathsToShape } from '../../chaveiros/chaveiro/nameOutline'
import { type ClipperPoint, offsetPaths, pathsToShapes, unionPaths } from './textOutline'

export interface SvgIconInput {
  /** Conteúdo do arquivo SVG */
  svg: string
  /** Raio útil (mm) em que o vértice mais distante do centro deve encaixar */
  maxRadius: number
  /** Espessura mínima (mm) para engrossar traços finos e tornar imprimível */
  lineWidth: number
  /** Escala relativa do ícone (0.5–1.0) aplicada após o encaixe */
  iconScale: number
  /** Profundidade de extrusão (mm) */
  depth: number
}

export interface SvgBounds {
  width: number
  height: number
  centerX: number
  centerY: number
  /** Distância do centro até o vértice mais distante */
  farthest: number
}

export interface Point2 {
  x: number
  y: number
}

/** Contorno preenchido (externo + furos), em coordenadas do SVG. */
export interface ParsedShape {
  outer: Point2[]
  holes: Point2[][]
}

/** Traço (stroke) como linha aberta + largura declarada, em coordenadas do SVG. */
export interface ParsedStroke {
  points: Point2[]
  width: number
}

/**
 * SVG achatado em dados serializáveis. A leitura do SVG usa `SVGLoader`, que
 * depende de `DOMParser` (só existe na main thread), então `parseSvg` roda lá;
 * o trabalho de Clipper/extrusão pode rodar em Web Worker a partir destes dados.
 */
export interface ParsedSvg {
  fills: ParsedShape[]
  strokes: ParsedStroke[]
}

interface SvgPathStyle {
  fill?: string
  stroke?: string
  strokeWidth?: number
}

// --- Parsing (precisa de DOMParser: rodar na main thread) ---

function pointsOf(points: Vector2[]): Point2[] {
  return points.map(p => ({ x: p.x, y: p.y }))
}

/** Lê o SVG e devolve preenchimentos e traços em dados serializáveis. */
export function parseSvg(svg: string): ParsedSvg | null {
  const loader = new SVGLoader()
  const svgData = loader.parse(svg)

  const fills: ParsedShape[] = []
  const strokes: ParsedStroke[] = []

  for (const path of svgData.paths) {
    const style = path.userData.style as SvgPathStyle
    const hasFill = style.fill !== undefined && style.fill !== 'none'
    const hasStroke = style.stroke !== undefined && style.stroke !== 'none'

    if (hasFill) {
      for (const shape of path.toShapes()) {
        fills.push({
          outer: pointsOf(shape.getPoints()),
          holes: shape.holes.map(hole => pointsOf(hole.getPoints())),
        })
      }
    }

    if (hasStroke) {
      const width = style.strokeWidth ?? 1
      for (const subPath of path.subPaths) {
        const points = pointsOf(subPath.getPoints())
        if (points.length >= 2) strokes.push({ points, width })
      }
    }
  }

  if (fills.length === 0 && strokes.length === 0) return null
  return { fills, strokes }
}

// --- Construção (pura: pode rodar em Web Worker) ---

function allPoints(parsed: ParsedSvg): Point2[] {
  const points: Point2[] = []
  for (const fill of parsed.fills) {
    points.push(...fill.outer)
    for (const hole of fill.holes) points.push(...hole)
  }
  for (const stroke of parsed.strokes) points.push(...stroke.points)
  return points
}

/** Dimensões do SVG em coordenadas do próprio arquivo (sem escala). */
export function svgBoundsFromParsed(parsed: ParsedSvg): SvgBounds | null {
  const points = allPoints(parsed)
  if (points.length === 0) return null

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  let farthest = 0
  for (const p of points) {
    const radius = Math.hypot(p.x - centerX, p.y - centerY)
    if (radius > farthest) farthest = radius
  }
  if (farthest <= 0) return null

  return { width: maxX - minX, height: maxY - minY, centerX, centerY, farthest }
}

function toClipperPath(points: Point2[]): ClipperPoint[] {
  return points.map(p => ({ X: Math.round(p.x * 1000), Y: Math.round(p.y * 1000) }))
}

// Silhueta de um path de linha (stroke) como Shape fechado, com a largura dada.
function strokeToShape(points: Vector2[], factor: number, halfWidth: number): Shape | null {
  if (points.length < 2) return null

  const path = points.map(p => ({ X: Math.round(p.x * factor * 1000), Y: Math.round(p.y * factor * 1000) }))

  const offset = new ClipperLib.ClipperOffset()
  const solution = new ClipperLib.Paths()
  offset.AddPaths([path], ClipperLib.JoinType.jtRound, ClipperLib.EndType.etOpenRound)
  offset.Execute(solution, Math.round(halfWidth * 1000))

  if (solution.length === 0) return null
  return clipperPathsToShape(solution)
}

/**
 * Shapes do SVG em coordenadas do próprio arquivo (sem escala/centro/rotação).
 *
 * Os fills são **unidos primeiro** (varredura rápida do Clipper, que resolve
 * auto-interseções) e só então engrossados uma única vez até `minFeatureSvg`.
 * Traços são convertidos em contorno sólido com espessura mínima.
 */
export function svgShapesFromParsed(parsed: ParsedSvg, minFeatureSvg: number): Shape[] {
  const fillPaths: ClipperPoint[][] = []
  for (const fill of parsed.fills) {
    if (fill.outer.length >= 3) fillPaths.push(toClipperPath(fill.outer))
    for (const hole of fill.holes) {
      if (hole.length >= 3) fillPaths.push(toClipperPath(hole))
    }
  }

  const shapes: Shape[] = []
  if (fillPaths.length > 0) {
    const unioned = unionPaths(fillPaths)
    const dilated = offsetPaths(unioned, minFeatureSvg / 2)
    shapes.push(...pathsToShapes(dilated))
  }

  for (const stroke of parsed.strokes) {
    const width = Math.max(stroke.width, minFeatureSvg)
    const outline = strokeToShape(stroke.points.map(p => new Vector2(p.x, p.y)), 1, width / 2)
    if (outline) shapes.push(outline)
  }

  return shapes
}

/**
 * Shapes do SVG exatamente como enviado: sem união, dilatação ou espessura
 * mínima. Traços viram contornos com a largura declarada no próprio SVG.
 */
export function svgRawShapesFromParsed(parsed: ParsedSvg): Shape[] {
  const shapes: Shape[] = []

  for (const fill of parsed.fills) {
    if (fill.outer.length < 3) continue
    const shape = new Shape(fill.outer.map(p => new Vector2(p.x, p.y)))
    for (const hole of fill.holes) {
      if (hole.length >= 3) {
        shape.holes.push(new Path(hole.map(p => new Vector2(p.x, p.y))))
      }
    }
    shapes.push(shape)
  }

  for (const stroke of parsed.strokes) {
    const outline = strokeToShape(
      stroke.points.map(p => new Vector2(p.x, p.y)),
      1,
      stroke.width / 2,
    )
    if (outline) shapes.push(outline)
  }

  return shapes
}

// --- Wrappers por string (uso na main thread / carimbo-brigadeiro) ---

export function svgBounds(svg: string): SvgBounds | null {
  const parsed = parseSvg(svg)
  return parsed ? svgBoundsFromParsed(parsed) : null
}

export function svgToShapes(svg: string, minFeatureSvg: number): Shape[] {
  const parsed = parseSvg(svg)
  return parsed ? svgShapesFromParsed(parsed, minFeatureSvg) : []
}

// Escala os contornos de um Shape em torno da origem.
function scaleShape(shape: Shape, factor: number): Shape {
  const outer = shape.getPoints().map(p => new Vector2(p.x * factor, p.y * factor))
  const scaled = new Shape(outer)

  for (const hole of shape.holes) {
    scaled.holes.push(new Path(hole.getPoints().map(p => new Vector2(p.x * factor, p.y * factor))))
  }

  return scaled
}

/**
 * Converte um SVG em geometria de relevo 3D (main thread — usa DOMParser).
 *
 * O resultado fica centralizado em X/Y, extrudado em Z a partir de 0 e girado
 * 180° no eixo Z (o SVGLoader entrega o eixo Y para baixo). O posicionamento
 * final em Z é responsabilidade do chamador.
 */
export function buildSvgIconGeometry({
  svg,
  maxRadius,
  lineWidth,
  iconScale,
  depth,
}: SvgIconInput): BufferGeometry | null {
  const parsed = parseSvg(svg)
  if (!parsed) return null

  const bounds = svgBoundsFromParsed(parsed)
  if (!bounds) return null

  // iconScale (0.5–1.0) encolhe o resultado; 1.0 preenche o raio útil.
  const scale = ((maxRadius - lineWidth / 2) / bounds.farthest) * iconScale
  if (scale <= 0) return null

  const shapes = svgShapesFromParsed(parsed, lineWidth / scale).map(shape => scaleShape(shape, scale))
  if (shapes.length === 0) return null

  const geometries = shapes.map(shape => new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 1,
  }))

  const iconGeometry = mergeGeometries(geometries)
  if (!iconGeometry) return null
  geometries.forEach(g => g.dispose())

  // Centraliza em X/Y e corrige a orientação (SVG chega com Y para baixo).
  iconGeometry.computeBoundingBox()
  const bb = iconGeometry.boundingBox!
  iconGeometry.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0)

  iconGeometry.rotateZ(Math.PI)

  return iconGeometry
}
