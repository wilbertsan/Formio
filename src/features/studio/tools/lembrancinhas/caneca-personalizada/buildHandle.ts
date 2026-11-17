import { BufferGeometry, ExtrudeGeometry } from 'three'
import { ADDITION, Brush, Evaluator } from 'three-bvh-csg'
import {
  getBandInnerRadius,
  getBandOuterRadius,
  getHandleMetrics,
  getLoopLeftX,
  handleLoopShape,
  handleRingShape,
  type HandleMetrics,
} from './shapes'
import type { MugGeometryParams } from './schema'

export {
  getBandInnerRadius,
  getBandOuterRadius,
  getHandleMetrics,
  getLoopLeftX,
  handleLoopShape,
  handleRingShape,
}
export type { HandleMetrics }

/**
 * `useCDTClipping` existe no runtime do three-bvh-csg, mas falta no
 * `index.d.ts` do pacote. O splitter CDT gera cortes conformes entre as duas
 * peças; o splitter legado deixa T-junctions nas bordas curvas da abraçadeira.
 */
type ConformingEvaluator = Evaluator & { useCDTClipping: boolean }

export function buildHandle(params: MugGeometryParams): BufferGeometry {
  const metrics = getHandleMetrics(params)

  const ring = new ExtrudeGeometry(handleRingShape(metrics), {
    depth: params.handleWidth,
    bevelEnabled: false,
    curveSegments: 96,
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

  const evaluator = new Evaluator() as ConformingEvaluator
  evaluator.useCDTClipping = true
  if (!evaluator.useCDTClipping) {
    throw new Error(
      'buildHandle: three-bvh-csg sem useCDTClipping; o splitter legado deixa a alça aberta.',
    )
  }
  const ringBrush = new Brush(ring)
  const loopBrush = new Brush(loop)
  ringBrush.updateMatrixWorld()
  loopBrush.updateMatrixWorld()
  const result = evaluator.evaluate(ringBrush, loopBrush, ADDITION).geometry

  ring.dispose()
  loop.dispose()
  result.computeVertexNormals()
  return result
}
