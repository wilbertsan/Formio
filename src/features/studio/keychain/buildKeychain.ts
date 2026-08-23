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
const CSG_TEXT_OVERFLOW = 1

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

  const textDepth =
    params.textMode === 'raised' ? params.textDepth : params.thickness + CSG_TEXT_OVERFLOW
  const textGeometry = nameToGeometry({ font, name: params.name, size: textSize, depth: textDepth })

  if (params.textMode === 'raised') {
    textGeometry.translate(0, 0, params.thickness - 0.01)
    const merged = mergeGeometries([baseGeometry, textGeometry])
    if (!merged) {
      onError?.('Falha ao montar o modelo')
      return baseGeometry
    }
    merged.computeVertexNormals()
    return merged
  }

  // Engraved mode: CSG subtraction
  try {
    const textClone = textGeometry.clone()
    textClone.translate(0, 0, -CSG_TEXT_OVERFLOW / 2)
    const evaluator = new Evaluator()
    const result = evaluator.evaluate(new Brush(baseGeometry), new Brush(textClone), SUBTRACTION)
    result.geometry.computeVertexNormals()
    return result.geometry
  } catch {
    onError?.('Falha na gravação; usando relevo')
    const fallback = textGeometry.clone()
    fallback.translate(0, 0, params.thickness - 0.01)
    const merged = mergeGeometries([baseGeometry, fallback])
    if (!merged) return baseGeometry
    merged.computeVertexNormals()
    return merged
  }
}
