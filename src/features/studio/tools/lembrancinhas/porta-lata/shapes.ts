import { Path, Shape, Vector2 } from 'three'
import {
  BASE_CHAMFER_MM,
  HANDLE_FIT_INTERFERENCE,
  HANDLE_LOOP_INSET,
  HANDLE_RING_THICKNESS,
  HANDLE_WRAP,
  getEffectiveLeadIn,
  getEffectiveRingProtrusion,
  getEffectiveRimChamfer,
  getInnerDiameter,
  getOuterHeight,
  getOuterRadius,
  type CanHolderGeometryParams,
} from './schema'

const DEDUPE_EPSILON = 1e-6

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
 * furo de ventilação → fundo externo → anel inferior → parede → anel superior →
 * borda → parede interna → fundo interno → furo. O primeiro e o último ponto
 * coincidem para fechar a superfície; o perfil não toca o eixo, então não há
 * leques degenerados.
 */
export function bodyProfile(params: CanHolderGeometryParams): Vector2[] {
  const outerR = getOuterRadius(params)
  const innerR = getInnerDiameter(params) / 2
  const ventR = params.ventHoleDiameter / 2
  const height = getOuterHeight(params)
  const leadIn = getEffectiveLeadIn(params)
  const chamfer = getEffectiveRimChamfer(params)
  const base = Math.min(BASE_CHAMFER_MM, outerR * 0.2)
  const protrusion = getEffectiveRingProtrusion(params)

  if (protrusion === 0) {
    return dedupePoints([
      new Vector2(ventR, 0),
      new Vector2(outerR - base, 0),
      new Vector2(outerR, base),
      new Vector2(outerR, height - chamfer),
      new Vector2(outerR - chamfer, height),
      new Vector2(innerR + leadIn, height),
      new Vector2(innerR, height - leadIn),
      new Vector2(innerR, params.bottomThickness),
      new Vector2(ventR, params.bottomThickness),
      new Vector2(ventR, 0),
    ])
  }

  const ringR = outerR + protrusion
  const width = params.edgeRimWidth

  return dedupePoints([
    new Vector2(ventR, 0),
    new Vector2(ringR - base, 0),
    new Vector2(ringR, base),
    new Vector2(ringR, width - protrusion),
    new Vector2(outerR, width),
    new Vector2(outerR, height - width),
    new Vector2(ringR, height - width + protrusion),
    new Vector2(ringR, height - chamfer),
    new Vector2(ringR - chamfer, height),
    new Vector2(innerR + leadIn, height),
    new Vector2(innerR, height - leadIn),
    new Vector2(innerR, params.bottomThickness),
    new Vector2(ventR, params.bottomThickness),
    new Vector2(ventR, 0),
  ])
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
 * Borda esquerda do laço: o corpo é cilíndrico, então a borda é vertical, a
 * `handleClearance + HANDLE_LOOP_INSET` da parede.
 */
export function getLoopLeftX(params: CanHolderGeometryParams): number {
  return (
    getOuterRadius(params) +
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
  params: CanHolderGeometryParams,
  y: number,
): number {
  const yBottom = params.handleHeight - params.handleWidth / 2
  const t = Math.min(1, Math.max(0, (y - yBottom) / params.handleWidth))
  const c = params.handleClearance
  const i = HANDLE_FIT_INTERFERENCE
  const gap = -2 * c * t * t + (c - 2 * i) * t + c + i
  return getOuterRadius(params) + gap
}

/**
 * Raio externo efetivo da abraçadeira: a mesma escala radial aplicada em
 * `buildHandle`, então a espessura acompanha o raio interno escalado.
 */
export function getBandOuterRadius(
  params: CanHolderGeometryParams,
  y: number,
): number {
  const nominal = getOuterRadius(params) + params.handleClearance
  return (
    (nominal + HANDLE_RING_THICKNESS) * (getBandInnerRadius(params, y) / nominal)
  )
}

export function getHandleMetrics(params: CanHolderGeometryParams): HandleMetrics {
  const bodyRadius = getOuterRadius(params)
  const innerRadius = bodyRadius + params.handleClearance
  const outerRadius = innerRadius + HANDLE_RING_THICKNESS
  const loopMinX = getLoopLeftX(params)
  const loopMaxX = bodyRadius + params.handleReach
  const handOpeningWidth = loopMaxX - loopMinX - 2 * params.handleBand

  return {
    innerRadius,
    outerRadius,
    handOpeningWidth,
    // A borda esquerda é vertical: a largura não varia com a altura.
    handOpeningMinWidth: handOpeningWidth,
    handOpeningHeight: params.handleGap,
    loopMinX,
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
 * Laço em D no plano XY, com a abertura da mão como furo retangular.
 *
 * A borda esquerda é vertical na parede cilíndrica e fica dentro da espessura
 * efetiva da abraçadeira no topo por
 * `HANDLE_RING_THICKNESS - HANDLE_FIT_INTERFERENCE - handleClearance -
 * HANDLE_LOOP_INSET` (≈0,7 mm no default e ≈0,8 mm com folga 0,2 mm), o que
 * garante sobreposição sólida para o CSG em toda a altura.
 */
export function handleLoopShape(params: CanHolderGeometryParams): Shape {
  const metrics = getHandleMetrics(params)
  const left = getLoopLeftX(params)
  const halfSpan = params.handleGap / 2 + params.handleBand
  const minY = params.handleHeight - halfSpan
  const maxY = params.handleHeight + halfSpan
  const maxX = metrics.loopMaxX
  const corner = params.handleBand

  const shape = new Shape()
  shape.moveTo(left, minY)
  shape.lineTo(maxX - corner, minY)
  shape.quadraticCurveTo(maxX, minY, maxX, minY + corner)
  shape.lineTo(maxX, maxY - corner)
  shape.quadraticCurveTo(maxX, maxY, maxX - corner, maxY)
  shape.lineTo(left, maxY)
  shape.closePath()

  const holeMinY = params.handleHeight - params.handleGap / 2
  const holeMaxY = params.handleHeight + params.handleGap / 2
  const holeMinX = left + params.handleBand
  const holeMaxX = maxX - params.handleBand

  const hole = new Path()
  hole.moveTo(holeMinX, holeMinY)
  hole.lineTo(holeMaxX, holeMinY)
  hole.lineTo(holeMaxX, holeMaxY)
  hole.lineTo(holeMinX, holeMaxY)
  hole.closePath()
  shape.holes.push(hole)
  return shape
}
