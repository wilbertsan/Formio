import { Vector2 } from 'three'
import { MINIMUM_WALL_MM, type MugGeometryParams } from './schema'

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
