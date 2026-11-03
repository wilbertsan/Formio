import { BoxGeometry, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const JOINT_BAR_DEPTH = 1.5
export const JOINT_BAR_HEIGHT = 0.8
/** Folga de impressão: o vão entre as barras é thickness + clearance. */
export const JOINT_CLEARANCE = 0.2

/** Centro da base: borda direita recuada 0,2mm da traseira do texto. */
export function splitBaseCenterX(width: number): number {
  return -JOINT_CLEARANCE - width / 2
}

/** Centro da parede de texto: traseira em x = 0. */
export function splitTextCenterX(relief: number): number {
  return relief / 2
}

function box(width: number, height: number, depth: number): BufferGeometry {
  const indexed = new BoxGeometry(width, height, depth)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  return geometry
}

/**
 * Duas barras na traseira do texto, com vão igual à espessura da base + folga.
 * A barra inferior passa por baixo do texto e a superior fica acima da base.
 */
export function createJointBars(
  textWidth: number,
  thickness: number,
  textRelief: number,
): BufferGeometry {
  // As barras começam na metade da espessura do texto e vão para trás.
  const barFrontX = textRelief / 2
  const barWidth = JOINT_BAR_DEPTH + barFrontX
  const barCenterX = (barFrontX - JOINT_BAR_DEPTH) / 2

  const lower = box(barWidth, textWidth, JOINT_BAR_HEIGHT)
  lower.translate(barCenterX, 0, -JOINT_BAR_HEIGHT / 2)

  const upper = box(barWidth, textWidth, JOINT_BAR_HEIGHT)
  upper.translate(
    barCenterX,
    0,
    thickness + JOINT_CLEARANCE + JOINT_BAR_HEIGHT / 2,
  )

  const merged = mergeGeometries([lower, upper])
  lower.dispose()
  upper.dispose()
  if (!merged) {
    throw new Error('Falha ao gerar as barras do encaixe')
  }
  return merged
}
