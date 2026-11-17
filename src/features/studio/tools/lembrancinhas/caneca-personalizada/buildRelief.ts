import type { BufferAttribute, BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { shapesToGeometry, textToShapes } from '../../confeitaria/shared/textOutline'
import {
  CONTENT_DEPTH,
  MAX_TEXT_ARC,
  RELIEF_EMBED,
  getOuterRadius,
  type MugGeometryParams,
} from './schema'

/**
 * Escala uniforme (x/y) para o texto caber no arco máximo, preservando o
 * relevo de 1 mm. Retorna 1 quando já cabe.
 */
export function fitRelief(
  width: number,
  centerRadius: number,
  maxArc: number = MAX_TEXT_ARC,
): number {
  if (width <= 0 || centerRadius <= 0) return 1
  const arc = width / centerRadius
  return arc > maxArc ? maxArc / arc : 1
}

function clampCenterY(params: MugGeometryParams, halfHeight: number): number {
  const minY = params.bottomThickness + 2 + halfHeight
  const maxY = params.height - params.rimChamfer - 2 - halfHeight
  if (minY > maxY) return params.textCenterY
  return Math.min(maxY, Math.max(minY, params.textCenterY))
}

export function buildRelief(
  font: Font,
  params: MugGeometryParams,
): BufferGeometry | null {
  const shapes = textToShapes(font, params.text, params.textSize)
  if (shapes.length === 0) return null

  // Extruda CONTENT_DEPTH visível + RELIEF_EMBED: depois do deslocamento de
  // -RELIEF_EMBED a face de trás fica 0,2 mm dentro da parede e a frente a
  // 1 mm acima dela, garantindo união CSG sem faces coplanares.
  const flat = shapesToGeometry(shapes, CONTENT_DEPTH + RELIEF_EMBED, false)
  flat.computeBoundingBox()
  const box = flat.boundingBox!
  const width = box.max.x - box.min.x
  const height = box.max.y - box.min.y
  if (width <= 0 || height <= 0) {
    flat.dispose()
    return null
  }

  const centerX = (box.min.x + box.max.x) / 2
  const centerY = (box.min.y + box.max.y) / 2
  const centerRadius = getOuterRadius(params, params.textCenterY)
  const scale = fitRelief(width, centerRadius)
  const halfHeight = (height * scale) / 2
  const centerYGlobal = clampCenterY(params, halfHeight)

  const position = flat.getAttribute('position') as BufferAttribute
  for (let i = 0; i < position.count; i++) {
    const localX = (position.getX(i) - centerX) * scale
    const localY = (position.getY(i) - centerY) * scale
    const localZ = position.getZ(i)

    const globalY = centerYGlobal + localY
    const radius = getOuterRadius(params, globalY) + localZ - RELIEF_EMBED
    // Sinal negativo: mantém a leitura da esquerda para a direita e o winding
    // para fora (um sinal positivo reflete o texto e inverte a orientação).
    const angle = Math.PI - localX / centerRadius

    position.setXYZ(i, radius * Math.cos(angle), globalY, radius * Math.sin(angle))
  }

  flat.computeBoundingBox()
  flat.computeBoundingSphere()
  flat.computeVertexNormals()
  return flat
}
