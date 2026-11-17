import {
  BufferGeometry,
  type BufferAttribute,
  type InterleavedBufferAttribute,
} from 'three'

/** Mesma precisão da checagem de manifold: 0,0001 mm. */
const POSITION_DECIMALS = 4
const ZERO_EPSILON = 5e-5

function positionKey(
  position: BufferAttribute | InterleavedBufferAttribute,
  index: number,
): string {
  const normalize = (value: number): number =>
    Math.abs(value) < ZERO_EPSILON ? 0 : value
  return `${normalize(position.getX(index)).toFixed(POSITION_DECIMALS)},${normalize(position.getY(index)).toFixed(POSITION_DECIMALS)},${normalize(position.getZ(index)).toFixed(POSITION_DECIMALS)}`
}

/**
 * Remove triângulos com aresta colapsada (dois vértices na mesma posição), sem
 * tocar nos atributos existentes.
 *
 * O `LatheGeometry` gera esses triângulos no eixo de revolução e o CSG pode
 * deixá-los na saída de uniões próximas ao relevo. Eles contam a mesma aresta
 * duas vezes, o que quebra a checagem de malha fechada (aresta com 4 usos).
 *
 * O critério é posição repetida, não área: o CSG também produz slivers de área
 * minúscula porém finitos que fazem parte da superfície. Removê-los abriria a
 * malha — só a aresta colapsada é segura de descartar, pois suas duas
 * contribuições se cancelam. A geometria original é descartada; o chamador
 * decide quando recalcular normais.
 */
export function removeDegenerateTriangles(
  geometry: BufferGeometry,
): BufferGeometry {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  if (!index) return geometry

  const keys = new Map<number, string>()
  const keyAt = (vertex: number): string => {
    const cached = keys.get(vertex)
    if (cached !== undefined) return cached
    const key = positionKey(position, vertex)
    keys.set(vertex, key)
    return key
  }

  const kept: number[] = []

  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i)
    const ib = index.getX(i + 1)
    const ic = index.getX(i + 2)
    const ka = keyAt(ia)
    const kb = keyAt(ib)
    const kc = keyAt(ic)

    if (ka === kb || kb === kc || kc === ka) continue
    kept.push(ia, ib, ic)
  }

  const result = new BufferGeometry()
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    result.setAttribute(name, attribute.clone())
  }
  result.setIndex(kept)
  geometry.dispose()

  return result
}
