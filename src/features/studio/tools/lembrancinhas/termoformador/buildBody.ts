import type { BufferGeometry } from 'three'
import { buildBodyShell, type RoundedRectSpec } from './shell'
import { SHELL_SEGMENTS, type ThermoformerGeometryParams } from './schema'

export function buildBody(params: ThermoformerGeometryParams): BufferGeometry {
  const halfMin = Math.min(params.width, params.depth) / 2
  const wall = Math.min(params.wallThickness, halfMin - 0.2)
  const rimThickness = Math.max(
    wall,
    Math.min(params.rimThickness, halfMin - 0.2),
  )

  const outer: RoundedRectSpec = {
    width: params.width,
    depth: params.depth,
    radius: Math.min(params.cornerRadius, halfMin),
  }
  const inner: RoundedRectSpec = {
    width: Math.max(0.2, params.width - 2 * wall),
    depth: Math.max(0.2, params.depth - 2 * wall),
    radius: Math.max(0, params.cornerRadius - wall),
  }
  const rimInner: RoundedRectSpec = {
    width: Math.max(0.2, params.width - 2 * rimThickness),
    depth: Math.max(0.2, params.depth - 2 * rimThickness),
    radius: Math.max(0, params.cornerRadius - rimThickness),
  }

  const chamfer = Math.min(
    params.edgeChamfer,
    wall * 0.8,
    rimThickness * 0.8,
    (params.height + params.rimHeight) * 0.2,
  )

  return buildBodyShell({
    outer,
    inner,
    rimInner,
    bottomThickness: params.bottomThickness,
    height: params.height,
    rimHeight: params.rimHeight,
    chamfer,
    segments: SHELL_SEGMENTS,
  })
}
