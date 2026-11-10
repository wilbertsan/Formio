import { ExtrudeGeometry, Shape } from 'three'
import {
  PHOTO_SIZES,
  PLATE_REAR_MIN,
  SLOT_GAP,
  type PhotoStandParams,
} from './schema'

export function getStandWidth(params: PhotoStandParams): number {
  return PHOTO_SIZES[params.photoSize].width + params.sideMargin * 2
}

/** Avanço horizontal da face inclinada do painel, do topo até a base. */
export function getRibRun(params: PhotoStandParams): number {
  const radians = (params.angle * Math.PI) / 180
  return (params.bandHeight - params.thickness) / Math.tan(radians)
}

/** Posição da face traseira do painel, medida da frente da peça. */
export function getRibBack(params: PhotoStandParams): number {
  return params.thickness + SLOT_GAP + getRibRun(params) + params.thickness
}

/**
 * Profundidade usada no build. Nunca menor que o perfil exige, para a fenda e o
 * painel continuarem válidos em qualquer combinação de parâmetros.
 */
export function getEffectiveDepth(params: PhotoStandParams): number {
  return Math.max(params.depth, getRibBack(params) + PLATE_REAR_MIN)
}

/**
 * Perfil lateral no plano XY, com `x` espelhando a profundidade (`x = -z`) para
 * que a extrusão em `+Z` gere a largura. Frente da peça em `x = 0`.
 */
export function createStandShape(params: PhotoStandParams): Shape {
  const height = params.bandHeight
  const thickness = params.thickness
  const depth = getEffectiveDepth(params)
  const run = getRibRun(params)
  const ribBack = getRibBack(params)

  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(0, height)
  shape.lineTo(-thickness, height)
  shape.lineTo(-thickness, thickness)
  shape.lineTo(-(thickness + SLOT_GAP), thickness)
  shape.lineTo(-(thickness + SLOT_GAP + run), height)
  shape.lineTo(-ribBack, height)
  shape.lineTo(-ribBack, thickness)
  shape.lineTo(-depth, thickness)
  shape.lineTo(-depth, 0)
  shape.closePath()
  return shape
}

/**
 * Base da peça: perfil lateral extrudado na largura da foto, centralizada em
 * X/Y/Z, com a face do conteúdo em `z = +depth/2`.
 */
export function createStandGeometry(params: PhotoStandParams): ExtrudeGeometry {
  const width = getStandWidth(params)
  const height = params.bandHeight
  const depth = getEffectiveDepth(params)

  const geometry = new ExtrudeGeometry(createStandShape(params), {
    depth: width,
    bevelEnabled: false,
    curveSegments: 1,
  })

  geometry.rotateY(-Math.PI / 2)
  geometry.translate(width / 2, -height / 2, depth / 2)
  geometry.computeVertexNormals()
  return geometry
}
