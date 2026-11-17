import { BufferGeometry, LatheGeometry, Vector3 } from 'three'
import { bodyProfile } from './shapes'
import { MUG_SEGMENTS, type MugGeometryParams } from './schema'

const DEGENERATE_AREA_EPSILON = 1e-12

/** Remove os triângulos de área nula gerados no eixo de revolução. */
function removeDegenerateTriangles(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  if (!index) return geometry

  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const ab = new Vector3()
  const ac = new Vector3()
  const cross = new Vector3()
  const kept: number[] = []

  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i)
    const ib = index.getX(i + 1)
    const ic = index.getX(i + 2)

    a.fromBufferAttribute(position, ia)
    b.fromBufferAttribute(position, ib)
    c.fromBufferAttribute(position, ic)
    ab.subVectors(b, a)
    ac.subVectors(c, a)

    if (cross.crossVectors(ab, ac).lengthSq() > DEGENERATE_AREA_EPSILON) {
      kept.push(ia, ib, ic)
    }
  }

  const result = new BufferGeometry()
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    result.setAttribute(name, attribute.clone())
  }
  result.setIndex(kept)
  geometry.dispose()

  return result
}

export function buildBody(params: MugGeometryParams): BufferGeometry {
  const geometry = new LatheGeometry(bodyProfile(params), MUG_SEGMENTS)
  return removeDegenerateTriangles(geometry)
}
