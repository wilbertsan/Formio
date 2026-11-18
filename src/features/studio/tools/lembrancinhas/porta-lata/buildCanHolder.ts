import type { BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { ADDITION, Brush } from 'three-bvh-csg'
import { buildBody } from './buildBody'
import { buildHandle } from './buildHandle'
import { buildRelief } from './buildRelief'
import { createConformingEvaluator } from './csg'
import { removeDegenerateTriangles } from './geometryCleanup'
import type { CanHolderGeometryParams } from './schema'

export interface CanHolderBuildResult {
  body: BufferGeometry
  handle: BufferGeometry | null
}

function unionRelief(body: BufferGeometry, relief: BufferGeometry): BufferGeometry {
  try {
    const evaluator = createConformingEvaluator()
    const bodyBrush = new Brush(body)
    const reliefBrush = new Brush(relief)
    bodyBrush.updateMatrixWorld()
    reliefBrush.updateMatrixWorld()

    const result = removeDegenerateTriangles(
      evaluator.evaluate(bodyBrush, reliefBrush, ADDITION).geometry,
    )
    result.computeVertexNormals()
    return result
  } finally {
    // As duas entradas viram lixo em qualquer caminho, inclusive se o CSG
    // falhar: as brushes não são donas da geometria.
    body.dispose()
    relief.dispose()
  }
}

export function buildCanHolder(
  params: CanHolderGeometryParams,
  font: Font,
): CanHolderBuildResult {
  const body = buildBody(params)
  let relief: BufferGeometry | null
  try {
    relief = buildRelief(font, params)
  } catch (error) {
    body.dispose()
    throw error
  }

  const finalBody = relief ? unionRelief(body, relief) : body
  if (!params.handleEnabled) return { body: finalBody, handle: null }

  try {
    return { body: finalBody, handle: buildHandle(params) }
  } catch (error) {
    // Falha do CSG da alça mantém o corpo sem vazar a geometria já unida.
    finalBody.dispose()
    throw error
  }
}

export function disposeCanHolderResult(result: CanHolderBuildResult): void {
  result.body.dispose()
  result.handle?.dispose()
}
