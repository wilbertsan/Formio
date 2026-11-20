import { BufferGeometry } from 'three'
import { ADDITION, Brush, SUBTRACTION } from 'three-bvh-csg'
import { createConformingEvaluator } from '../shared/csg'
import { removeDegenerateTriangles } from '../shared/geometryCleanup'

/**
 * Consome `base` e `tools` e devolve uma nova geometria limpa.
 * `ADDITION` une; `SUBTRACTION` corta.
 */
export function csg(
  base: BufferGeometry,
  tools: BufferGeometry[],
  operation = SUBTRACTION,
): BufferGeometry {
  if (tools.length === 0) return base
  const evaluator = createConformingEvaluator()
  // `loftOutline` não gera UV e as peças são de material único; sem restringir
  // os atributos, o CSG falha ao exigir UV em todas as geometrias.
  evaluator.attributes = ['position', 'normal']
  let current = base
  const pending = [...tools]
  try {
    while (pending.length > 0) {
      const tool = pending.shift()!
      const a = new Brush(current)
      const b = new Brush(tool)
      a.updateMatrixWorld()
      b.updateMatrixWorld()
      const result = evaluator.evaluate(a, b, operation).geometry
      current.dispose()
      tool.dispose()
      current = removeDegenerateTriangles(result)
    }
    current.computeVertexNormals()
    return current
  } catch (error) {
    current.dispose()
    for (const tool of pending) tool.dispose()
    throw error
  }
}

export function unionParts(parts: BufferGeometry[]): BufferGeometry {
  if (parts.length === 0) return new BufferGeometry()
  const [first, ...rest] = parts
  return csg(first, rest, ADDITION)
}
