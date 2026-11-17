import type { BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { ADDITION, Brush } from 'three-bvh-csg'
import { buildBody } from './buildBody'
import { buildHandle } from './buildHandle'
import { buildRelief } from './buildRelief'
import { createConformingEvaluator } from './csg'
import type { MugGeometryParams } from './schema'

export interface BuildMugResult {
  body: BufferGeometry
  handle: BufferGeometry | null
}

function unionRelief(body: BufferGeometry, relief: BufferGeometry): BufferGeometry {
  const evaluator = createConformingEvaluator()
  const bodyBrush = new Brush(body)
  const reliefBrush = new Brush(relief)
  bodyBrush.updateMatrixWorld()
  reliefBrush.updateMatrixWorld()

  const result = evaluator.evaluate(bodyBrush, reliefBrush, ADDITION).geometry
  body.dispose()
  relief.dispose()
  result.computeVertexNormals()
  return result
}

export function buildMug(
  params: MugGeometryParams,
  font: Font,
): BuildMugResult {
  const body = buildBody(params)
  const relief = buildRelief(font, params)

  return {
    body: relief ? unionRelief(body, relief) : body,
    handle: params.handleEnabled ? buildHandle(params) : null,
  }
}

export function disposeMugResult(result: BuildMugResult): void {
  result.body.dispose()
  result.handle?.dispose()
}
