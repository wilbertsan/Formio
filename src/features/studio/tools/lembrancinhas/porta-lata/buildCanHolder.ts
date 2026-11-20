import type { BufferAttribute, BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { ADDITION, Brush } from 'three-bvh-csg'
import { buildBody, findOuterWall } from './buildBody'
import { buildHandle } from './buildHandle'
import { buildRelief } from './buildRelief'
import { createConformingEvaluator } from '../shared/csg'
import { removeDegenerateTriangles } from '../shared/geometryCleanup'
import { bodyProfile } from './shapes'
import {
  getInnerDiameter,
  getOuterRadius,
  getTextureEnvelope,
  type CanHolderGeometryParams,
} from './schema'

const EDGE_EPSILON = 1e-3

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

/**
 * O CSG reindexa o corpo e recalcula as normais; as duas colunas duplicadas da
 * emenda θ=0/2π voltam a ver só metade do leque. Solda por posição na parede.
 */
function weldSeamNormals(
  geometry: BufferGeometry,
  params: CanHolderGeometryParams,
): void {
  if (params.textureStyle === 'none') return
  const outerR = getOuterRadius(params)
  const envelope = getTextureEnvelope(params)
  const wall = findOuterWall(bodyProfile(params), getInnerDiameter(params) / 2)
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal') as BufferAttribute
  const groups = new Map<string, number[]>()

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    if (Math.abs(x) > 1e-4 || z <= 0) continue
    if (y < wall.min - EDGE_EPSILON || y > wall.max + EDGE_EPSILON) continue
    const radius = Math.hypot(x, z)
    if (radius < outerR - 1e-4 || radius > outerR + envelope + 1e-3) continue
    const key = y.toFixed(3)
    const group = groups.get(key)
    if (group) group.push(i)
    else groups.set(key, [i])
  }

  for (const indices of groups.values()) {
    if (indices.length < 2) continue
    let nx = 0
    let ny = 0
    let nz = 0
    for (const index of indices) {
      nx += normal.getX(index)
      ny += normal.getY(index)
      nz += normal.getZ(index)
    }
    const length = Math.hypot(nx, ny, nz)
    if (length < 1e-12) continue
    for (const index of indices) {
      normal.setXYZ(index, nx / length, ny / length, nz / length)
    }
  }
  normal.needsUpdate = true
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
  weldSeamNormals(finalBody, params)
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
