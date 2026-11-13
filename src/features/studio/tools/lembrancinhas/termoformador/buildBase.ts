import type { BufferGeometry } from 'three'
import { buildRingShell, type RoundedRectSpec } from './shell'
import type { ThermoformerGeometryParams } from './schema'

export interface BaseDimensions {
  outer: RoundedRectSpec
  inner: RoundedRectSpec
  height: number
  chamfer: number
}

export function getBaseDimensions(
  params: ThermoformerGeometryParams,
): BaseDimensions {
  const bodyRadius = Math.min(
    params.cornerRadius,
    Math.min(params.width, params.depth) / 2,
  )
  const innerWidth = params.width + 2 * params.printClearance
  const innerDepth = params.depth + 2 * params.printClearance
  const outerWidth = innerWidth + 2 * params.baseThickness
  const outerDepth = innerDepth + 2 * params.baseThickness

  const requestedOuterRadius = Math.min(
    params.baseCornerRadius,
    outerWidth / 2,
    outerDepth / 2,
  )
  const requestedInnerRadius = Math.max(
    0,
    requestedOuterRadius - params.baseThickness,
  )
  // O furo precisa conter o corpo deslocado por printClearance: qualquer raio
  // interno maior que bodyRadius + printClearance cortaria os cantos do corpo.
  const innerRadius = Math.min(
    requestedInnerRadius,
    bodyRadius + params.printClearance,
    innerWidth / 2,
    innerDepth / 2,
  )
  // O contorno externo é o contorno interno deslocado por baseThickness. Um
  // raio maior que isso recua o canto externo para dentro do furo (o anel se
  // auto-intersecta), por isso o pedido só pode reduzir o raio, nunca aumentá-lo.
  const outerRadius = Math.min(
    outerWidth / 2,
    outerDepth / 2,
    innerRadius + params.baseThickness,
  )

  return {
    outer: { width: outerWidth, depth: outerDepth, radius: outerRadius },
    inner: { width: innerWidth, depth: innerDepth, radius: innerRadius },
    height: Math.max(0.2, params.baseHeight),
    chamfer: params.edgeChamfer,
  }
}

export function buildBase(params: ThermoformerGeometryParams): BufferGeometry {
  const dims = getBaseDimensions(params)

  return buildRingShell({
    outer: dims.outer,
    inner: dims.inner,
    height: dims.height,
    chamfer: dims.chamfer,
    segments: 256,
  })
}
