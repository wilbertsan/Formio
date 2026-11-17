import {
  BufferAttribute,
  BufferGeometry,
  type InterleavedBufferAttribute,
} from 'three'

/**
 * Precisão da chave de posição: 1e-4 mm, a mesma de `positionKey` em
 * `tests/features/studio/tools/lembrancinhas/caneca-personalizada/geometryTestUtils.ts`.
 * Mantém a limpeza alinhada à checagem de manifold usada nos testes.
 */
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
 * Remove triângulos com aresta colapsada, sem tocar nos atributos existentes.
 *
 * O `LatheGeometry` gera esses triângulos no eixo de revolução e o CSG pode
 * deixá-los na saída de uniões próximas ao relevo. Eles contam a mesma aresta
 * duas vezes, o que quebra a checagem de malha fechada (aresta com 4 usos).
 *
 * O critério é posição repetida, não área. O predicado usa chaves arredondadas
 * em 1e-4 mm, então remove triângulos cujos vértices coincidem dentro dessa
 * tolerância — não só os exatamente coincidentes. Isso acompanha a precisão da
 * checagem de manifold. Slivers finitos abaixo da tolerância também podem ser
 * removidos; na escala de impressão (1 unidade = 1 mm) isso é aceitável.
 *
 * Slivers finitos acima da tolerância são mantidos de propósito: o CSG produz
 * vários deles que fazem parte da superfície fechada, e removê-los abriria a
 * malha. A geometria original é consumida (descartada); o chamador decide
 * quando recalcular normais. Entrada não indexada é devolvida como está, sem
 * ser consumida.
 *
 * `groups` e `drawRange` não são copiados: o resultado é uma peça de material
 * único (preview e STL), então os grupos de material do CSG não têm uso.
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
  // Preserva a largura do índice (Uint16/Uint32) em vez de deixar o three
  // reescolher pelo maior índice restante.
  const IndexArray = index.array.constructor as new (
    values: number[],
  ) => Uint16Array | Uint32Array
  result.setIndex(new BufferAttribute(new IndexArray(kept), 1))
  geometry.dispose()

  return result
}
