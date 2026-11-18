import { BufferGeometry, LatheGeometry } from 'three'
import { removeDegenerateTriangles } from './geometryCleanup'
import { bodyProfile } from './shapes'
import { HOLDER_SEGMENTS, type CanHolderGeometryParams } from './schema'

export function buildBody(params: CanHolderGeometryParams): BufferGeometry {
  const geometry = new LatheGeometry(bodyProfile(params), HOLDER_SEGMENTS)
  return removeDegenerateTriangles(geometry)
}
