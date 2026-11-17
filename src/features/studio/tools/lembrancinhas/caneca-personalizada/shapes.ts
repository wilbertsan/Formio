import { Path, Shape, Vector2 } from 'three'
import {
  HANDLE_FIT_INTERFERENCE,
  HANDLE_LOOP_INSET,
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
  handOpeningMinWidth: number
  handOpeningHeight: number
  loopMinX: number
  loopMaxX: number
}

/**
 * Borda esquerda do laço: acompanha a conicidade do corpo, sempre a
 * `handleClearance + HANDLE_LOOP_INSET` da parede.
 */
export function getLoopLeftX(params: MugGeometryParams, y: number): number {
  return (
    getBodyOuterRadius(params, y) +
    params.handleClearance +
    HANDLE_LOOP_INSET
  )
}

/**
 * Raio interno da abraçadeira na altura `y`. O offset é quadrático em `t`
 * (0 na base, 1 no topo) e vale:
 *
 * - base (t=0): `handleClearance + HANDLE_FIT_INTERFERENCE`
 * - meio (t=0,5): `handleClearance`
 * - topo (t=1): `-HANDLE_FIT_INTERFERENCE`, absoluto para qualquer folga
 *
 * Assim o topo morde o corpo em 0,4 mm em vez de `handleClearance - 0,4`, e a
 * peça é montada por baixo.
 */
export function getBandInnerRadius(
  params: MugGeometryParams,
  y: number,
): number {
  const yBottom = params.handleHeight - params.handleWidth / 2
  const t = Math.min(1, Math.max(0, (y - yBottom) / params.handleWidth))
  const c = params.handleClearance
  const i = HANDLE_FIT_INTERFERENCE
  const gap = -2 * c * t * t + (c - 2 * i) * t + c + i
  return getBodyOuterRadius(params, y) + gap
}

/**
 * Raio externo efetivo da abraçadeira: a mesma escala radial aplicada em
 * `buildHandle`, então a espessura acompanha o raio interno escalado.
 */
export function getBandOuterRadius(
  params: MugGeometryParams,
  y: number,
): number {
  const nominal =
    getBodyOuterRadius(params, params.handleHeight) + params.handleClearance
  return (
    (nominal + HANDLE_RING_THICKNESS) * (getBandInnerRadius(params, y) / nominal)
  )
}

export function getHandleMetrics(params: MugGeometryParams): HandleMetrics {
  const bodyRadius = getBodyOuterRadius(params, params.handleHeight)
  const innerRadius = bodyRadius + params.handleClearance
  const outerRadius = innerRadius + HANDLE_RING_THICKNESS
  const loopMaxX = bodyRadius + params.handleReach
  // O furo é trapezoidal: a largura varia linearmente com a altura, então o
  // mínimo está sempre em um dos extremos.
  const widthAt = (y: number): number =>
    loopMaxX - getLoopLeftX(params, y) - 2 * params.handleBand
  const halfGap = params.handleGap / 2

  return {
    innerRadius,
    outerRadius,
    handOpeningWidth: widthAt(params.handleHeight),
    handOpeningMinWidth: Math.min(
      widthAt(params.handleHeight - halfGap),
      widthAt(params.handleHeight + halfGap),
    ),
    handOpeningHeight: params.handleGap,
    loopMinX: getLoopLeftX(params, params.handleHeight),
    loopMaxX,
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

/**
 * Laço em D no plano XY, com a abertura da mão como furo.
 *
 * A borda esquerda segue o perfil do corpo em todo o vão vertical do laço, e
 * não a reta de `loopMinX`, para não colidir com a parede cônica. No topo ela
 * fica dentro da espessura efetiva da abraçadeira por
 * `HANDLE_RING_THICKNESS - HANDLE_FIT_INTERFERENCE - handleClearance -
 * HANDLE_LOOP_INSET` (≈0,8 mm no default e ≈0,9 mm com folga 0,2 mm), o que
 * garante sobreposição sólida para o CSG em toda a altura.
 */
export function handleLoopShape(params: MugGeometryParams): Shape {
  const metrics = getHandleMetrics(params)
  const halfSpan = params.handleGap / 2 + params.handleBand
  const minY = params.handleHeight - halfSpan
  const maxY = params.handleHeight + halfSpan
  const maxX = metrics.loopMaxX
  const corner = params.handleBand

  const shape = new Shape()
  shape.moveTo(getLoopLeftX(params, minY), minY)
  shape.lineTo(maxX - corner, minY)
  shape.quadraticCurveTo(maxX, minY, maxX, minY + corner)
  shape.lineTo(maxX, maxY - corner)
  shape.quadraticCurveTo(maxX, maxY, maxX - corner, maxY)
  shape.lineTo(getLoopLeftX(params, maxY), maxY)
  shape.closePath()

  const holeMinY = params.handleHeight - params.handleGap / 2
  const holeMaxY = params.handleHeight + params.handleGap / 2
  const holeMinX = getLoopLeftX(params, holeMinY) + params.handleBand
  const holeMaxX = maxX - params.handleBand

  const hole = new Path()
  hole.moveTo(holeMinX, holeMinY)
  hole.lineTo(holeMaxX, holeMinY)
  hole.lineTo(holeMaxX, holeMaxY)
  hole.lineTo(getLoopLeftX(params, holeMaxY) + params.handleBand, holeMaxY)
  hole.closePath()
  shape.holes.push(hole)
  return shape
}
