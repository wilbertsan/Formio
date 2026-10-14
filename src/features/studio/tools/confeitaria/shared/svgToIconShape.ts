import { type BufferGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import ClipperLib from 'js-clipper'
import { clipperPathsToShape, shapeToClipperPaths } from '../../chaveiros/chaveiro/nameOutline'
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

interface SvgPathStyle {
  fill?: string
  stroke?: string
  strokeWidth?: number
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

/** Dimensões do SVG em coordenadas do próprio arquivo (sem escala). */
export function svgBounds(svg: string): SvgBounds | null {
  const loader = new SVGLoader()
  const svgData = loader.parse(svg)

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const path of svgData.paths) {
    for (const subPath of path.subPaths) {
      for (const p of subPath.getPoints()) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
      }
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  let farthest = 0
  for (const path of svgData.paths) {
    for (const subPath of path.subPaths) {
      for (const p of subPath.getPoints()) {
        const radius = Math.hypot(p.x - centerX, p.y - centerY)
        if (radius > farthest) farthest = radius
      }
    }
  }
  if (farthest <= 0) return null

  return { width: maxX - minX, height: maxY - minY, centerX, centerY, farthest }
}

/**
 * Shapes do SVG em coordenadas do próprio arquivo (sem escala/centro/rotação).
 *
 * Os fills são **unidos primeiro** (varredura rápida do Clipper, que resolve
 * auto-interseções) e só então engrossados uma única vez até `minFeatureSvg`.
 * Isso evita aplicar `ClipperOffset` por shape sobre contornos auto-intersectantes,
 * que é ordens de magnitude mais lento. Traços são convertidos em contorno sólido
 * com espessura mínima.
 */
export function svgToShapes(svg: string, minFeatureSvg: number): Shape[] {
  const loader = new SVGLoader()
  const svgData = loader.parse(svg)

  const fillPaths: ClipperPoint[][] = []
  const strokeShapes: Shape[] = []

  for (const path of svgData.paths) {
    const style = path.userData.style as SvgPathStyle
    const hasFill = style.fill !== undefined && style.fill !== 'none'
    const hasStroke = style.stroke !== undefined && style.stroke !== 'none'

    if (hasFill) {
      for (const shape of path.toShapes()) {
        fillPaths.push(...shapeToClipperPaths(shape))
      }
    }

    if (hasStroke) {
      const strokeWidth = Math.max(style.strokeWidth ?? 1, minFeatureSvg)
      for (const subPath of path.subPaths) {
        const outline = strokeToShape(subPath.getPoints(), 1, strokeWidth / 2)
        if (outline) strokeShapes.push(outline)
      }
    }
  }

  const shapes: Shape[] = []
  if (fillPaths.length > 0) {
    const unioned = unionPaths(fillPaths)
    const dilated = offsetPaths(unioned, minFeatureSvg / 2)
    shapes.push(...pathsToShapes(dilated))
  }

  return [...shapes, ...strokeShapes]
}

/**
 * Converte um SVG em geometria de relevo 3D.
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
  const bounds = svgBounds(svg)
  if (!bounds) return null

  // iconScale (0.5–1.0) encolhe o resultado; 1.0 preenche o raio útil.
  const scale = ((maxRadius - lineWidth / 2) / bounds.farthest) * iconScale
  if (scale <= 0) return null

  // Trabalhamos em coordenadas do SVG (minFeatureSvg) e escalamos depois.
  const shapes = svgToShapes(svg, lineWidth / scale).map(shape => scaleShape(shape, scale))
  if (shapes.length === 0) return null

  const geometries = shapes.map(shape => new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 1,
  }))

  const iconGeometry = mergeGeometries(geometries)
  geometries.forEach(g => g.dispose())
  if (!iconGeometry) return null

  // Centraliza em X/Y e corrige a orientação (SVG chega com Y para baixo).
  iconGeometry.computeBoundingBox()
  const bb = iconGeometry.boundingBox!
  iconGeometry.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0)

  // O SVG chega em coordenadas com Y para baixo (SVGLoader), o que deixaria o
  // ícone de cabeça para baixo no three.js (Y para cima). Girar 180° no eixo Z
  // corrige a orientação e aplica o espelhamento em X da face de contato.
  iconGeometry.rotateZ(Math.PI)

  return iconGeometry
}
