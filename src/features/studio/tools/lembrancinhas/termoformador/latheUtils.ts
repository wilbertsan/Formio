import { BufferGeometry, Vector2, Vector3 } from 'three'

const DEGENERATE_AREA_EPSILON = 1e-12

export function dedupeProfile(points: Vector2[]): Vector2[] {
  const result: Vector2[] = []
  for (const point of points) {
    const last = result[result.length - 1]
    if (!last || last.distanceTo(point) > 1e-6) result.push(point)
  }
  return result
}

export function removeDegenerateTriangles(
  geometry: BufferGeometry,
): BufferGeometry {
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
  result.setAttribute('position', position.clone())
  result.setIndex(kept)
  result.computeVertexNormals()
  geometry.dispose()

  return result
}
