import { Path, Shape, Vector2 } from 'three'
import {
  HANDLE_RING_THICKNESS,
  HANDLE_WRAP,
  MINIMUM_WALL_MM,
  type MugGeometryParams,
} from './schema'

const DEDUPE_EPSILON = 1e-6

/** Chanfro efetivo da borda: nunca come o anel mínimo da parede. */
export function getEffectiveRimChamfer(params: MugGeometryParams): number {
  return Math.max(0, Math.min(params.rimChamfer, params.wallThickness - MINIMUM_WALL_MM))
}

/**
 * Raio externo do corpo na altura `y`. A parede cônica termina em
 * `height - chamfer`, não em `height`, então a interpolação usa esse topo.
 */
export function getBodyOuterRadius(params: MugGeometryParams, y: number): number {
  const chamfer = getEffectiveRimChamfer(params)
  const wallTop = Math.max(1e-6, params.height - chamfer)
  const t = Math.min(1, Math.max(0, y / wallTop))
  return (params.diameterBottom / 2) * (1 - t) + (params.diameterTop / 2) * t
}

export function getInnerRadius(params: MugGeometryParams, y: number): number {
  return Math.max(0.5, getBodyOuterRadius(params, y) - params.wallThickness)
}

export function dedupePoints(points: Vector2[]): Vector2[] {
  const result: Vector2[] = []
  for (const point of points) {
    const last = result[result.length - 1]
    if (!last || last.distanceTo(point) > DEDUPE_EPSILON) result.push(point)
  }
  return result
}

/**
 * Perfil fechado no plano (r, y) para o LatheGeometry:
 * eixo do fundo → fundo externo → parede externa → borda → parede interna →
 * fundo interno → eixo.
 */
export function bodyProfile(params: MugGeometryParams): Vector2[] {
  const outerBottom = params.diameterBottom / 2
  const outerTop = params.diameterTop / 2
  const innerTop = getInnerRadius(params, params.height)
  const innerBottom = getInnerRadius(params, params.bottomThickness)
  // O anel plano da borda nunca desce abaixo da parede mínima.
  const chamfer = getEffectiveRimChamfer(params)

  const points: Vector2[] = [
    new Vector2(0, 0),
    new Vector2(outerBottom, 0),
    new Vector2(outerTop, params.height - chamfer),
  ]

  if (chamfer > 0) {
    points.push(new Vector2(outerTop - chamfer, params.height))
  }
  points.push(new Vector2(innerTop, params.height))
  points.push(new Vector2(innerBottom, params.bottomThickness))
  points.push(new Vector2(0, params.bottomThickness))

  return dedupePoints(points)
}

export interface HandleMetrics {
  innerRadius: number
  outerRadius: number
  handOpeningWidth: number
  handOpeningHeight: number
  loopMinX: number
  loopMaxX: number
}

export function getHandleMetrics(params: MugGeometryParams): HandleMetrics {
  const bodyRadius = getBodyOuterRadius(params, params.handleHeight)
  const innerRadius = bodyRadius + params.handleClearance
  const outerRadius = innerRadius + HANDLE_RING_THICKNESS
  return {
    innerRadius,
    outerRadius,
    handOpeningWidth:
      params.handleReach - HANDLE_RING_THICKNESS - 2 * params.handleBand,
    handOpeningHeight: params.handleGap,
    loopMinX: outerRadius - 1,
    loopMaxX: bodyRadius + params.handleReach,
  }
}

/** Setor anular de 200° centrado no +X, desenhado no plano XY. */
export function handleRingShape(metrics: HandleMetrics): Shape {
  const start = -HANDLE_WRAP / 2
  const end = HANDLE_WRAP / 2
  const shape = new Shape()
  shape.absarc(0, 0, metrics.outerRadius, start, end, false)
  shape.absarc(0, 0, metrics.innerRadius, end, start, true)
  shape.closePath()
  return shape
}

function roundedRect(
  shape: Shape | Path,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, (maxX - minX) / 2, (maxY - minY) / 2))
  shape.moveTo(minX + r, minY)
  shape.lineTo(maxX - r, minY)
  shape.quadraticCurveTo(maxX, minY, maxX, minY + r)
  shape.lineTo(maxX, maxY - r)
  shape.quadraticCurveTo(maxX, maxY, maxX - r, maxY)
  shape.lineTo(minX + r, maxY)
  shape.quadraticCurveTo(minX, maxY, minX, maxY - r)
  shape.lineTo(minX, minY + r)
  shape.quadraticCurveTo(minX, minY, minX + r, minY)
  shape.closePath()
}

/** Laço em D no plano XY, com a abertura da mão como furo. */
export function handleLoopShape(params: MugGeometryParams): Shape {
  const metrics = getHandleMetrics(params)
  const halfHeight = params.handleGap / 2 + params.handleBand
  const minY = params.handleHeight - halfHeight
  const maxY = params.handleHeight + halfHeight
  const minX = metrics.loopMinX
  const maxX = metrics.loopMaxX

  const shape = new Shape()
  roundedRect(shape, minX, minY, maxX, maxY, params.handleBand)

  const hole = new Path()
  roundedRect(
    hole,
    metrics.outerRadius + params.handleBand,
    params.handleHeight - params.handleGap / 2,
    maxX - params.handleBand,
    params.handleHeight + params.handleGap / 2,
    params.handleBand / 2,
  )
  shape.holes.push(hole)
  return shape
}
