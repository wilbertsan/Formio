import type { BufferGeometry } from 'three'
import { buildBody } from './buildBody'
import { buildLid, getLidDimensions } from './buildLid'
import { buildFrontPanel } from './buildFrontPanel'
import { buildHandle } from './buildHandle'
import { buildBase } from './buildBase'
import type { ThermoformerGeometryParams } from './schema'

export interface BuildThermoformerResult {
  body: BufferGeometry
  lid: BufferGeometry | null
  frontPanel: BufferGeometry
  handle: BufferGeometry | null
  base: BufferGeometry | null
}

export function buildThermoformer(
  params: ThermoformerGeometryParams,
): BuildThermoformerResult {
  const bodyTop = params.height + params.rimHeight
  const body = buildBody(params)

  const frontPanel = buildFrontPanel(params)
  frontPanel.translate(0, bodyTop / 2, params.depth / 2)

  const lid = params.lidEnabled ? buildLid(params) : null
  if (lid) lid.translate(0, getLidDimensions(params).bottomY, 0)

  const handle = params.handleEnabled ? buildHandle(params) : null
  const base = params.baseEnabled ? buildBase(params) : null

  return { body, lid, frontPanel, handle, base }
}

export function disposeThermoformerResult(
  result: BuildThermoformerResult | null,
): void {
  if (!result) return
  result.body.dispose()
  result.lid?.dispose()
  result.frontPanel.dispose()
  result.handle?.dispose()
  result.base?.dispose()
}
