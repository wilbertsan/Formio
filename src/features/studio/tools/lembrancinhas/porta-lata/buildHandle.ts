import { BufferGeometry, ExtrudeGeometry } from 'three'
import { ADDITION, Brush } from 'three-bvh-csg'
import { createConformingEvaluator } from '../shared/csg'
import { removeDegenerateTriangles } from '../shared/geometryCleanup'
import {
  getBandInnerRadius,
  getBandOuterRadius,
  getHandleMetrics,
  getLoopLeftX,
  handleLoopShape,
  handleRingShape,
  type HandleMetrics,
} from './shapes'
import type { CanHolderGeometryParams } from './schema'

export {
  getBandInnerRadius,
  getBandOuterRadius,
  getHandleMetrics,
  getLoopLeftX,
  handleLoopShape,
  handleRingShape,
}
export type { HandleMetrics }

export function buildHandle(params: CanHolderGeometryParams): BufferGeometry {
  const metrics = getHandleMetrics(params)

  const ring = new ExtrudeGeometry(handleRingShape(metrics), {
    depth: params.handleWidth,
    bevelEnabled: false,
    curveSegments: 96,
    // Anéis intermediários para que a escala radial realize a parábola de
    // interferência, não a corda entre base e topo.
    steps: 8,
  })
  // Anel no plano XZ, altura em +Y, centrado na altura da alça.
  ring.rotateX(-Math.PI / 2)

  // Acompanha a conicidade do corpo e a interferência do encaixe por pressão.
  const ringPosition = ring.getAttribute('position')
  for (let i = 0; i < ringPosition.count; i++) {
    const yLocal = ringPosition.getY(i)
    const yGlobal = params.handleHeight - params.handleWidth / 2 + yLocal
    const scale = getBandInnerRadius(params, yGlobal) / metrics.innerRadius
    ringPosition.setX(i, ringPosition.getX(i) * scale)
    ringPosition.setZ(i, ringPosition.getZ(i) * scale)
  }
  ring.computeVertexNormals()
  ring.translate(0, params.handleHeight - params.handleWidth / 2, 0)

  const loop = new ExtrudeGeometry(handleLoopShape(params), {
    depth: params.handleWidth,
    bevelEnabled: false,
    curveSegments: 16,
  })
  loop.translate(0, 0, -params.handleWidth / 2)

  const evaluator = createConformingEvaluator()
  const ringBrush = new Brush(ring)
  const loopBrush = new Brush(loop)
  ringBrush.updateMatrixWorld()
  loopBrush.updateMatrixWorld()

  try {
    // A limpeza remove os triângulos colapsados que o CSG deixa quando o anel
    // escalado encosta no laço (extremos de parede/folga); sem ela a malha
    // pode ficar com arestas usadas 4 vezes.
    const result = removeDegenerateTriangles(
      evaluator.evaluate(ringBrush, loopBrush, ADDITION).geometry,
    )
    result.computeVertexNormals()
    return result
  } finally {
    // As brushes não são donas da geometria; libera as entradas também se o
    // CSG da alça falhar.
    ring.dispose()
    loop.dispose()
  }
}
