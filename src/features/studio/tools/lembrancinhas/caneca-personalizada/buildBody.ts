import { BufferGeometry, LatheGeometry } from 'three'
import { removeDegenerateTriangles } from './geometryCleanup'
import { bodyProfile } from './shapes'
import { MUG_SEGMENTS, type MugGeometryParams } from './schema'

export function buildBody(params: MugGeometryParams): BufferGeometry {
  const geometry = new LatheGeometry(bodyProfile(params), MUG_SEGMENTS)
  return removeDegenerateTriangles(geometry)
}
