import type { BufferGeometry } from 'three'
import { buildLidShell, type RoundedRectSpec } from './shell'
import { SHELL_SEGMENTS, type ThermoformerGeometryParams } from './schema'

export interface LidDimensions {
  outer: RoundedRectSpec
  inner: RoundedRectSpec
  totalHeight: number
  plateBottom: number
  bottomY: number
}

function clampRadius(radius: number, width: number, depth: number): number {
  return Math.max(0, Math.min(radius, Math.min(width, depth) / 2))
}

export function getLidDimensions(params: ThermoformerGeometryParams): LidDimensions {
  const bodyTop = params.height + params.rimHeight
  const totalHeight = params.lidFitDepth + params.lidHeight + params.lidThickness
  const effectiveThickness = Math.max(0.2, Math.min(params.lidThickness, totalHeight - 0.2))
  const plateBottom = Math.max(0.1, totalHeight - effectiveThickness)
  const bottomY = bodyTop - params.lidFitDepth

  if (params.fitType === 'external') {
    const innerWidth = params.width + 2 * params.lidClearance
    const innerDepth = params.depth + 2 * params.lidClearance
    const outerWidth = innerWidth + 2 * effectiveThickness
    const outerDepth = innerDepth + 2 * effectiveThickness
    const maxOuterRadius = Math.min(outerWidth, outerDepth) / 2
    const clearanceRadius = params.cornerRadius + params.lidClearance
    const minInnerRadius = clampRadius(clearanceRadius, innerWidth, innerDepth)

    let outerRadius = clampRadius(params.lidCornerRadius, outerWidth, outerDepth)
    let innerRadius = Math.max(0, Math.min(outerRadius - effectiveThickness, Math.min(innerWidth, innerDepth) / 2))
    innerRadius = Math.max(innerRadius, minInnerRadius)
    outerRadius = Math.min(maxOuterRadius, Math.max(outerRadius, innerRadius + effectiveThickness))

    return {
      outer: { width: outerWidth, depth: outerDepth, radius: outerRadius },
      inner: { width: innerWidth, depth: innerDepth, radius: innerRadius },
      totalHeight,
      plateBottom,
      bottomY,
    }
  }

  const rimThickness = Math.max(params.wallThickness, params.rimThickness)
  const openingWidth = Math.max(0.2, params.width - 2 * rimThickness - 2 * params.lidClearance)
  const openingDepth = Math.max(0.2, params.depth - 2 * rimThickness - 2 * params.lidClearance)
  const outerRadius = clampRadius(params.lidCornerRadius, openingWidth, openingDepth)
  const innerWidth = Math.max(0.2, openingWidth - 2 * effectiveThickness)
  const innerDepth = Math.max(0.2, openingDepth - 2 * effectiveThickness)
  const innerRadius = Math.max(
    0,
    Math.min(outerRadius - effectiveThickness, Math.min(innerWidth, innerDepth) / 2),
  )

  return {
    outer: { width: openingWidth, depth: openingDepth, radius: outerRadius },
    inner: { width: innerWidth, depth: innerDepth, radius: innerRadius },
    totalHeight,
    plateBottom,
    bottomY,
  }
}

export function buildLid(params: ThermoformerGeometryParams): BufferGeometry {
  const dims = getLidDimensions(params)
  const effectiveThickness = Math.max(0.2, Math.min(params.lidThickness, dims.totalHeight - 0.2))
  const chamfer = Math.min(
    params.edgeChamfer,
    effectiveThickness * 0.8,
    dims.totalHeight * 0.2,
    Math.min(dims.outer.width, dims.outer.depth) * 0.1,
  )

  return buildLidShell({
    outer: dims.outer,
    inner: dims.inner,
    totalHeight: dims.totalHeight,
    plateThickness: effectiveThickness,
    chamfer,
    segments: SHELL_SEGMENTS,
  })
}
