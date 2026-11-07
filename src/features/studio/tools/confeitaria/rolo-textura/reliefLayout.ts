import { Path, Shape, Vector2 } from 'three'
import {
  clipPathsToRect, offsetPaths, toClipperPaths, unionPaths, type ClipperPoint,
} from '../shared/textOutline'
import type { MotifShape } from './patterns'
import {
  DENSITY_CELL_MM, EDGE_MARGIN_MM, END_FILLET_MM, MIN_FEATURE_MM,
  type TextureRollerParams,
} from './schema'

export interface ReliefLayout {
  circumference: number
  cellCols: number
  cellRows: number
  cellW: number
  cellH: number
  cellSpan: number
}

export interface MotifFit {
  scale: number
  dilation: number
}

export function computeReliefLayout(params: TextureRollerParams): ReliefLayout {
  const circumference = Math.PI * params.diameter
  const cellMm = DENSITY_CELL_MM[params.density]
  const cellCols = Math.max(3, Math.round(circumference / cellMm))
  const cellRows = Math.max(2, Math.round(params.length / cellMm))
  const cellW = circumference / cellCols
  const cellH = params.length / cellRows
  return {
    circumference,
    cellCols,
    cellRows,
    cellW,
    cellH,
    cellSpan: Math.min(cellW, cellH),
  }
}

export function motifSpan(shapes: MotifShape[]): number {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const shape of shapes) {
    for (const p of shape.outer) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
  }
  if (!Number.isFinite(minX)) return 0
  return Math.max(maxX - minX, maxY - minY)
}

export function scaleMotif(shapes: MotifShape[], scale: number): MotifShape[] {
  return shapes.map((shape) => ({
    outer: shape.outer.map((p) => ({ x: p.x * scale, y: p.y * scale })),
    holes: shape.holes.map((hole) => hole.map((p) => ({ x: p.x * scale, y: p.y * scale }))),
  }))
}

/**
 * Ajusta o motivo para caber no tamanho externo desejado e, se a espessura
 * mínima ficar abaixo de MIN_FEATURE_MM, reduz a escala e dilata o contorno.
 */
export function fitMotif(outerSpan: number, minThickness: number, baseScale: number): MotifFit {
  if (outerSpan <= 0) return { scale: baseScale, dilation: 0 }

  const scaledMin = minThickness * baseScale
  if (scaledMin >= MIN_FEATURE_MM) return { scale: baseScale, dilation: 0 }

  const outer = outerSpan * baseScale
  const denominator = outerSpan - minThickness
  if (denominator <= 1e-6 || outer <= MIN_FEATURE_MM) {
    return { scale: Math.max(baseScale, MIN_FEATURE_MM / outerSpan), dilation: 0 }
  }

  const scale = (outer - MIN_FEATURE_MM) / denominator
  const dilation = Math.max(0, (MIN_FEATURE_MM - minThickness * scale) / 2)
  return { scale, dilation }
}

function shapeToClipperAtOrigin(shape: MotifShape): ClipperPoint[][] {
  const flat = new Shape(shape.outer.map((p) => new Vector2(p.y, p.x)))
  for (const hole of shape.holes) {
    flat.holes.push(new Path(hole.map((p) => new Vector2(p.y, p.x))))
  }
  return toClipperPaths([flat])
}

export interface BuildPatternPathsInput {
  params: TextureRollerParams
  layout: ReliefLayout
  shapes: MotifShape[]
  dilation: number
  staggered: boolean
}

export function buildPatternPaths({
  params, layout, shapes, dilation, staggered,
}: BuildPatternPathsInput): ClipperPoint[][] {
  const prepared = shapes.flatMap((shape) => {
    const paths = shapeToClipperAtOrigin(shape)
    return dilation > 0 ? offsetPaths(paths, dilation) : paths
  })

  const shift = Math.round(layout.circumference * 1000)
  const paths: ClipperPoint[][] = []

  for (let row = 0; row < layout.cellRows; row++) {
    const axialCenter = -params.length / 2 + (row + 0.5) * layout.cellH
    const arcOffset = staggered && row % 2 === 1 ? layout.cellW / 2 : 0
    for (let col = 0; col < layout.cellCols; col++) {
      const arcCenter = (col + 0.5) * layout.cellW + arcOffset
      const dx = Math.round(axialCenter * 1000)
      const dy = Math.round(arcCenter * 1000)
      for (const path of prepared) {
        const placed = path.map((p) => ({ X: p.X + dx, Y: p.Y + dy }))
        paths.push(placed)
        paths.push(placed.map((p) => ({ X: p.X, Y: p.Y + shift })))
        paths.push(placed.map((p) => ({ X: p.X, Y: p.Y - shift })))
      }
    }
  }

  const margin = Math.max(EDGE_MARGIN_MM, END_FILLET_MM)
  return clipPathsToRect(
    unionPaths(paths),
    -params.length / 2 + margin,
    0,
    params.length / 2 - margin,
    layout.circumference,
  )
}
