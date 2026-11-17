import { Vector2 } from 'three'
import { getOuterRadius, type MugGeometryParams } from './schema'

const DEDUPE_EPSILON = 1e-6

export function getInnerRadius(params: MugGeometryParams, y: number): number {
  return Math.max(0.5, getOuterRadius(params, y) - params.wallThickness)
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
  const innerTop = Math.max(0.5, outerTop - params.wallThickness)
  const innerBottom = Math.max(0.5, outerBottom - params.wallThickness)
  const chamfer = Math.max(
    0,
    Math.min(params.rimChamfer, params.wallThickness / 2, params.height * 0.1),
  )

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
