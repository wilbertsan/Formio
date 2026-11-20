import { BufferGeometry, ConeGeometry } from 'three'
import { ADDITION, SUBTRACTION } from 'three-bvh-csg'
import {
  scalePaths,
  type ClipperPoint,
} from '../../confeitaria/shared/textOutline'
import { extrudeOutline, loftOutline } from './loft'
import { getTrayDimensions } from './tray'
import { csg } from './csg'
import type { ShapeOutline } from './outline'
import type { ThermoformerGeometryParams } from './schema'

/**
 * O loft e o CSG só fecham com um contorno único. Um SVG côncavo pode dividir
 * a abertura da cavidade em ilhas ao encolher pelo degrau; falhar aqui deixa o
 * erro descritivo em vez de uma geometria vazia dentro do CSG.
 */
function singleContour(
  paths: ClipperPoint[][] | null,
  label: string,
): ClipperPoint[][] {
  if (!paths || paths.length !== 1 || paths[0].length < 3) {
    throw new Error(
      `Contorno ${label} precisa ser único; reduza o aro/degrau ou simplifique o SVG.`,
    )
  }
  return paths
}

export function buildTraySupport(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): BufferGeometry {
  // Antes dos contornos para o círculo reportar o erro de forma, não o de
  // contorno (o círculo não tem caminhos poligonais).
  const dims = getTrayDimensions(params, outline)
  const outerPaths = singleContour(outline.supportOuter, 'externo do suporte')
  const recessPaths = singleContour(outline.recess, 'do rebaixo')
  const cavityPaths = singleContour(
    outline.cavityOpening,
    'da abertura da cavidade',
  )
  const outer = extrudeOutline(outerPaths, dims.height, 0)
  const recess = extrudeOutline(
    recessPaths,
    dims.height - dims.seatY,
    dims.seatY,
  )
  const cavity = loftOutline(
    cavityPaths,
    scalePaths(cavityPaths, dims.bottomScale),
    params.bottomThickness,
    dims.seatY,
  )
  return csg(outer, [recess, cavity], SUBTRACTION)
}

export function buildTrayPlug(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): BufferGeometry {
  const bodyPaths = singleContour(outline.paths, 'do corpo')
  const cavityPaths = singleContour(
    outline.cavityOpening,
    'da abertura da cavidade',
  )
  const dims = getTrayDimensions(params, outline)
  const body = extrudeOutline(
    bodyPaths,
    dims.bodyTop - dims.contactY,
    dims.contactY,
  )
  const protrusion = loftOutline(
    cavityPaths,
    scalePaths(cavityPaths, dims.bottomScale),
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
