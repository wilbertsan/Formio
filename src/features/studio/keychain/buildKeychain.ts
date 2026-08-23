import { type BufferGeometry, ExtrudeGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Evaluator, SUBTRACTION, Brush } from 'three-bvh-csg'
import { createBaseShape } from './shapes'
import { fitTextHeight, nameToGeometry } from './textToGeometry'
import type { KeychainParams } from './schema'

export interface BuildKeychainInput {
  font: Font
  params: KeychainParams
  onError?: (message: string) => void
}

const TEXT_WIDTH_FACTOR = 0.62
const ENGRAVE_EPSILON = 0.2

export function buildKeychain({ font, params, onError }: BuildKeychainInput): BufferGeometry {
  const baseShape = createBaseShape(params.shape, params.width, params.height, params.holeDiameter)
  const baseGeometry = new ExtrudeGeometry(baseShape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 1,
  })

  const availableWidth = params.width - 8
  const textSize = fitTextHeight({
    name: params.name,
    requestedSize: params.textHeight,
    maxWidth: availableWidth,
    factor: TEXT_WIDTH_FACTOR,
  })

  if (params.textMode === 'raised') {
    const textGeometry = nameToGeometry({
      font,
      name: params.name,
      size: textSize,
      depth: params.textDepth,
    })
    textGeometry.translate(0, 0, params.thickness - 0.01)
    const merged = mergeGeometries([baseGeometry, textGeometry])
    if (!merged) {
      onError?.('Falha ao montar o modelo')
      return baseGeometry
    }
    merged.computeVertexNormals()
    return merged
  }

  try {
    const textGeometry = nameToGeometry({
      font,
      name: params.name,
      size: textSize,
      depth: params.textDepth + ENGRAVE_EPSILON,
    })
    textGeometry.translate(0, 0, params.thickness)
    const evaluator = new Evaluator()
    const result = evaluator.evaluate(new Brush(baseGeometry), new Brush(textGeometry), SUBTRACTION)
    result.geometry.computeVertexNormals()
    return result.geometry
  } catch {
    onError?.('Falha na gravação; usando relevo')
    const fallback = nameToGeometry({
      font,
      name: params.name,
      size: textSize,
      depth: params.textDepth,
    })
    fallback.translate(0, 0, params.thickness - 0.01)
    const merged = mergeGeometries([baseGeometry, fallback])
    if (!merged) return baseGeometry
    merged.computeVertexNormals()
    return merged
  }
}
