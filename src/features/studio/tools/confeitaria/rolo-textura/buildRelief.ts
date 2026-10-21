import { ExtrudeGeometry, Path, Shape, Vector2, type BufferGeometry } from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { svgRawShapesFromParsed, type ParsedSvg } from '../shared/svgToIconShape'
import {
  clipPathsToRect, pathsToShapes, toClipperPaths, unionPaths, type ClipperPoint,
} from '../shared/textOutline'
import { isStaggered, motifShapes, type MotifShape } from './patterns'
import {
  DENSITY_CELL_MM, EDGE_MARGIN_MM, END_FILLET_MM, RELIEF_BEVEL_MM,
  type PatternMotif, type TextureRollerParams,
} from './schema'

const EMBED_MM = 0.1

// Usa o SVG exatamente como enviado (sem união/dilatação), apenas com escala
// uniforme para caber na célula. O SVGLoader entrega Y para baixo; negamos Y.
function svgMotifShapes(parsed: ParsedSvg | null): MotifShape[] {
  if (!parsed) return []
  const raw = svgRawShapesFromParsed(parsed)
  if (raw.length === 0) return []
  const merged = pathsToShapes(unionPaths(toClipperPaths(raw)))
  if (merged.length === 0) return []

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const shape of merged) {
    for (const p of [...shape.getPoints(), ...shape.holes.flatMap((h) => h.getPoints())]) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
  }
  const span = Math.max(maxX - minX, maxY - minY)
  if (!Number.isFinite(span) || span <= 0) return []
  const scale = 0.88 / span
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  return merged.map((shape) => ({
    outer: shape.getPoints().map((p) => ({ x: (p.x - cx) * scale, y: -(p.y - cy) * scale })),
    holes: shape.holes.map((h) => h.getPoints().map((p) => ({ x: (p.x - cx) * scale, y: -(p.y - cy) * scale }))),
  }))
}

export function buildRelief(params: TextureRollerParams, parsedSvg?: ParsedSvg | null): BufferGeometry | null {
  const circumference = Math.PI * params.diameter
  const cellMm = DENSITY_CELL_MM[params.density]
  const cellCols = Math.max(3, Math.round(circumference / cellMm))
  const cellRows = Math.max(2, Math.round(params.length / cellMm))
  const cellW = circumference / cellCols
  const cellH = params.length / cellRows

  const shapes = params.patternSource === 'svg'
    ? svgMotifShapes(parsedSvg ?? null)
    : motifShapes(params.patternFamily, params.patternMotif as PatternMotif)
  const staggered = params.patternSource !== 'svg'
    && isStaggered(params.patternMotif as PatternMotif)
  if (shapes.length === 0) return null

  // Constrói os contornos no plano desenrolado (X axial, Y arc), replicando
  // as células e cópias deslocadas de uma volta para unir motivos na emenda.
  const paths: ClipperPoint[][] = []
  const shift = Math.round(circumference * 1000)
  for (let row = 0; row < cellRows; row++) {
    const axialCenter = -params.length / 2 + (row + 0.5) * cellH
    const arcOffset = staggered && row % 2 === 1 ? cellW / 2 : 0
    for (let col = 0; col < cellCols; col++) {
      const arcCenter = (col + 0.5) * cellW + arcOffset
      for (const shape of shapes) {
        const mapPoint = (p: { x: number; y: number }) => new Vector2(
          axialCenter + p.y * cellH,
          arcCenter + p.x * cellW,
        )
        const flat = new Shape(shape.outer.map(mapPoint))
        for (const hole of shape.holes) flat.holes.push(new Path(hole.map(mapPoint)))
        for (const path of toClipperPaths([flat])) {
          paths.push(path)
          paths.push(path.map((p) => ({ X: p.X, Y: p.Y + shift })))
          paths.push(path.map((p) => ({ X: p.X, Y: p.Y - shift })))
        }
      }
    }
  }

  const margin = Math.max(EDGE_MARGIN_MM, END_FILLET_MM)
  const clipped = clipPathsToRect(
    unionPaths(paths),
    -params.length / 2 + margin,
    0,
    params.length / 2 - margin,
    circumference,
  )
  if (clipped.length === 0) return null

  const flatShapes = pathsToShapes(clipped)
  if (flatShapes.length === 0) return null

  // SVG mantém o traço original sem chanfro; motivos internos recebem chanfro.
  const bevel = params.patternSource !== 'svg'
  const extrusions = flatShapes.map((shape) => new ExtrudeGeometry(shape, {
    depth: params.reliefDepth + EMBED_MM,
    bevelEnabled: bevel,
    bevelThickness: RELIEF_BEVEL_MM,
    bevelSize: RELIEF_BEVEL_MM,
    bevelSegments: 2,
  }))
  const merged = mergeGeometries(extrusions)
  extrusions.forEach((g) => g.dispose())
  if (!merged) return null

  merged.deleteAttribute('uv')
  merged.computeBoundingBox()
  merged.translate(0, 0, params.reliefDepth - merged.boundingBox!.max.z)

  // Curva o plano no cilindro: X vira eixo, Y vira arco e Z vira raio.
  const position = merged.getAttribute('position')
  const radius = params.diameter / 2
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const arc = position.getY(i)
    const z = position.getZ(i)
    const angle = arc / radius
    const r = radius + z
    position.setXYZ(i, x, r * Math.cos(angle), r * Math.sin(angle))
  }
  position.needsUpdate = true

  const creased = toCreasedNormals(merged, Math.PI / 6)
  merged.dispose()
  creased.setIndex(Array.from({ length: creased.getAttribute('position').count }, (_, i) => i))
  return creased
}
