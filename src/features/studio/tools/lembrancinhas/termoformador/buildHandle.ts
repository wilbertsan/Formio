import {
  BufferGeometry,
  LatheGeometry,
  Matrix4,
  Vector2,
} from 'three'
import type { ThermoformerGeometryParams } from './schema'

const RADIAL_SEGMENTS = 32

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function buildHandleProfile(params: ThermoformerGeometryParams): Vector2[] {
  const shaftRadius = params.handleDiameter / 2
  const baseRadius = Math.max(shaftRadius, params.handleBaseDiameter / 2)
  const flangeHeight = Math.min(
    Math.max(0.8, params.handleBaseDiameter * 0.12),
    params.handleLength * 0.3,
  )
  const taperEnd = Math.min(
    params.handleLength - 0.1,
    flangeHeight + Math.max(0.5, baseRadius - shaftRadius),
  )
  const availableTip = Math.max(0, params.handleLength - taperEnd)
  const tipRadius = Math.min(params.handleTipRadius, availableTip)
  const tipStart = params.handleLength - tipRadius

  const points: Vector2[] = [
    new Vector2(0, 0),
    new Vector2(baseRadius, 0),
    new Vector2(baseRadius, flangeHeight),
    new Vector2(shaftRadius, taperEnd),
  ]

  if (tipStart - taperEnd > 1e-6) {
    points.push(new Vector2(shaftRadius, tipStart))
  }

  if (tipRadius > 0.01) {
    for (let i = 1; i <= 6; i++) {
      const angle = (i / 6) * (Math.PI / 2)
      points.push(new Vector2(
        shaftRadius - tipRadius + tipRadius * Math.cos(angle),
        tipStart + tipRadius * Math.sin(angle),
      ))
    }
  }

  points.push(new Vector2(0, params.handleLength))

  const deduped: Vector2[] = []
  for (const point of points) {
    const last = deduped[deduped.length - 1]
    if (!last || last.distanceTo(point) > 1e-6) deduped.push(point)
  }
  return deduped
}

export function handlePlacement(params: ThermoformerGeometryParams): Matrix4 {
  const bodyTop = params.height + params.rimHeight
  const flangeRadius = Math.max(params.handleBaseDiameter, params.handleDiameter) / 2
  const vertical = clamp(
    params.handleHeight * bodyTop,
    flangeRadius,
    Math.max(flangeRadius, bodyTop - flangeRadius),
  )
  const horizontal = clamp(
    params.handleHeight * params.width,
    flangeRadius,
    Math.max(flangeRadius, params.width - flangeRadius),
  )

  const matrix = new Matrix4()
  switch (params.handleSide) {
    case 'right':
      matrix.makeRotationZ(-Math.PI / 2)
      matrix.setPosition(params.width / 2, vertical, 0)
      break
    case 'left':
      matrix.makeRotationZ(Math.PI / 2)
      matrix.setPosition(-params.width / 2, vertical, 0)
      break
    case 'top':
      matrix.identity()
      matrix.setPosition(horizontal, bodyTop, 0)
      break
    case 'bottom':
      matrix.makeRotationZ(Math.PI)
      matrix.setPosition(horizontal, 0, 0)
      break
  }
  return matrix
}

export function buildHandle(params: ThermoformerGeometryParams): BufferGeometry {
  const indexed = new LatheGeometry(buildHandleProfile(params), RADIAL_SEGMENTS)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.applyMatrix4(handlePlacement(params))
  geometry.computeVertexNormals()
  return geometry
}

export function prepareHandleForPrint(
  geometry: BufferGeometry,
  params: ThermoformerGeometryParams,
): BufferGeometry {
  const clone = geometry.clone()
  clone.applyMatrix4(handlePlacement(params).clone().invert())
  return clone
}
