import { ExtrudeGeometry, type BufferGeometry } from 'three'
import { hexagonPath } from './shapes'
import { computeScreenPattern } from './screenPattern'
import type { ShapeOutline } from './outline'
import { SCREEN_SEGMENTS, type ThermoformerGeometryParams } from './schema'

export function buildScreen(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): BufferGeometry {
  const shape = outline.shape
  const pattern = computeScreenPattern(params, outline)

  for (const cell of pattern.cells) {
    shape.holes.push(hexagonPath(cell.x, cell.y, cell.radius))
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: params.thickness,
    bevelEnabled: false,
    curveSegments: SCREEN_SEGMENTS,
  })

  // Deita a tela: o disco passa para o plano XZ e a espessura para +Y.
  geometry.rotateX(-Math.PI / 2)
  geometry.computeVertexNormals()

  return geometry
}
