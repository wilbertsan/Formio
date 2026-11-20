import { BufferGeometry, ConeGeometry } from 'three'
import { ADDITION, SUBTRACTION } from 'three-bvh-csg'
import { scalePaths } from '../../confeitaria/shared/textOutline'
import { extrudeOutline, loftOutline } from './loft'
import { getTrayDimensions } from './tray'
import { csg } from './csg'
import type { ShapeOutline } from './outline'
import type { ThermoformerGeometryParams } from './schema'

export function buildTraySupport(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): BufferGeometry {
  const dims = getTrayDimensions(params, outline)
  const outer = extrudeOutline(outline.supportOuter!, dims.height, 0)
  const recess = extrudeOutline(
    outline.recess!,
    dims.height - dims.seatY,
    dims.seatY,
  )
  const cavity = loftOutline(
    outline.cavityOpening!,
    scalePaths(outline.cavityOpening!, dims.bottomScale),
    params.bottomThickness,
    dims.seatY,
  )
  return csg(outer, [recess, cavity], SUBTRACTION)
}

export function buildTrayPlug(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): BufferGeometry {
  const dims = getTrayDimensions(params, outline)
  const body = extrudeOutline(
    outline.paths!,
    dims.bodyTop - dims.contactY,
    dims.contactY,
  )
  const protrusion = loftOutline(
    outline.cavityOpening!,
    scalePaths(outline.cavityOpening!, dims.bottomScale),
    params.bottomThickness + params.thickness,
    dims.contactY,
  )
  const united = csg(body, [protrusion], ADDITION)
  const grip = new ConeGeometry(dims.gripRadius, dims.gripDepth, 64)
  grip.rotateX(Math.PI)
  grip.translate(0, dims.bodyTop - dims.gripDepth / 2, 0)
  grip.computeVertexNormals()
  return csg(united, [grip], SUBTRACTION)
}
