import { type BufferGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import ClipperLib from 'js-clipper'
import { clipperPathsToShape } from '../../chaveiros/chaveiro/nameOutline'
import { type ClipperPoint, offsetPaths, pathsToShapes, unionPaths } from './textOutline'

const BEVEL = 0.1

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
export function parseSvg(svg: string, curveSegments = 12): ParsedSvg | null {
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
          outer: pointsOf(shape.getPoints(curveSegments)),
          holes: shape.holes.map(hole => pointsOf(hole.getPoints(curveSegments))),
        })
      }
    }

    if (hasStroke) {
      const width = style.strokeWidth ?? 1
      for (const subPath of path.subPaths) {
        const points = pointsOf(subPath.getPoints(curveSegments))
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
export function strokeToShape(points: Vector2[], factor: number, halfWidth: number): Shape | null {
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
export function scaleShape(shape: Shape, factor: number): Shape {
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
export function buildSvgIconGeometry(
  input: SvgIconInput,
): BufferGeometry | null {
  const parsed = parseSvg(input.svg)
  if (!parsed) return null
  return buildSvgIconGeometryFromParsed(parsed, input)
}

export function buildSvgIconGeometryFromParsed(
  parsed: ParsedSvg,
  {
    maxRadius,
    lineWidth,
    iconScale,
    depth,
  }: Omit<SvgIconInput, 'svg'>,
): BufferGeometry | null {
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

export interface SvgIconBoxInput {
  svg: string
  maxWidth: number
  maxHeight: number
  lineWidth: number
  iconScale: number
  depth: number
}

/**
 * Converte um SVG em geometria de relevo encaixada em uma caixa com proporção,
 * preservando o aspecto original. O resultado fica centralizado em X/Y,
 * extrudado em Z a partir de 0 e girado 180° no eixo Z.
 */
export function buildSvgIconGeometryInBox(
  input: SvgIconBoxInput,
): BufferGeometry | null {
  const parsed = parseSvg(input.svg)
  if (!parsed) return null
  return buildSvgIconGeometryInBoxFromParsed(parsed, input)
}

export function buildSvgIconGeometryInBoxFromParsed(
  parsed: ParsedSvg,
  {
    maxWidth,
    maxHeight,
    lineWidth,
    iconScale,
    depth,
  }: Omit<SvgIconBoxInput, 'svg'>,
): BufferGeometry | null {
  const bounds = svgBoundsFromParsed(parsed)
  if (!bounds || (bounds.width <= 0 && bounds.height <= 0)) return null

  const maxStroke = Math.max(0, ...parsed.strokes.map(s => s.width))

  // A dilatação mínima (`lineWidth`), traços largos e o bevel aumentam as
  // dimensões finais; desconta-os da caixa para o ícone caber de fato.
  let scale = Math.min(
    bounds.width > 0 ? maxWidth / bounds.width : Infinity,
    bounds.height > 0 ? maxHeight / bounds.height : Infinity,
  ) * iconScale
  for (let i = 0; i < 2; i++) {
    const margin = Math.max(lineWidth, maxStroke * scale) + 2 * BEVEL
    const availW = maxWidth - margin
    const availH = maxHeight - margin
    if (availW <= 0 || availH <= 0) return null
    scale = Math.min(
      bounds.width > 0 ? availW / bounds.width : Infinity,
      bounds.height > 0 ? availH / bounds.height : Infinity,
    ) * iconScale
  }
  if (scale <= 0) return null

  const shapes = svgShapesFromParsed(parsed, lineWidth / scale).map(shape => scaleShape(shape, scale))
  if (shapes.length === 0) return null

  const geometries = shapes.map(shape => new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 1,
  }))

  const iconGeometry = mergeGeometries(geometries)
  geometries.forEach(g => g.dispose())
  if (!iconGeometry) return null

  // Rescala de segurança caso dilatação/bevel ainda ultrapassem a caixa.
  iconGeometry.computeBoundingBox()
  const fit = iconGeometry.boundingBox!
  const width = fit.max.x - fit.min.x
  const height = fit.max.y - fit.min.y
  if (width > maxWidth || height > maxHeight) {
    const fix = Math.min(maxWidth / width, maxHeight / height)
    iconGeometry.scale(fix, fix, 1)
    iconGeometry.computeBoundingBox()
  }

  const bb = iconGeometry.boundingBox!
  iconGeometry.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -bb.min.z)
  iconGeometry.rotateZ(Math.PI)

  return iconGeometry
}
