import { ExtrudeGeometry, type BufferGeometry } from 'three'
import { roundedRectPath, roundedRectShape } from './shapes'
import type { ThermoformerGeometryParams } from './schema'

export function buildBase(params: ThermoformerGeometryParams): BufferGeometry {
  const height = Math.max(0.2, params.baseHeight)
  const bevel = Math.min(params.edgeChamfer, height * 0.4, params.baseThickness * 0.5)
  // Abaixo desse valor o bevel degenera e o ExtrudeGeometry já o desabilita.
  const effectiveBevel = bevel > 0.01 ? bevel : 0

  const innerWidth = params.width + 2 * params.printClearance
  const innerDepth = params.depth + 2 * params.printClearance
  const outerWidth = innerWidth + 2 * params.baseThickness
  const outerDepth = innerDepth + 2 * params.baseThickness
  const innerRadius = Math.max(
    0,
    Math.min(
      params.baseCornerRadius - params.baseThickness,
      innerWidth / 2 - 0.1,
      innerDepth / 2 - 0.1,
    ),
  )

  // ExtrudeGeometry expande o contorno em `bevelSize` no meio da extrusão e
  // acrescenta `bevelThickness` em cada ponta. Compensamos o contorno e a
  // profundidade para preservar as dimensões externas e a altura nominais.
  const shape = roundedRectShape(
    outerWidth - 2 * effectiveBevel,
    outerDepth - 2 * effectiveBevel,
    params.baseCornerRadius - effectiveBevel,
  )
  shape.holes.push(roundedRectPath(innerWidth, innerDepth, innerRadius))

  const geometry = new ExtrudeGeometry(shape, {
    depth: height - 2 * effectiveBevel,
    bevelEnabled: effectiveBevel > 0,
    bevelSize: effectiveBevel,
    bevelThickness: effectiveBevel,
    bevelSegments: 2,
    curveSegments: 12,
  })
  geometry.rotateX(-Math.PI / 2)
  // O bevel inferior se estende para -Y; apoia a base em Y = 0.
  if (effectiveBevel > 0) geometry.translate(0, effectiveBevel, 0)
  geometry.computeVertexNormals()
  return geometry
}
