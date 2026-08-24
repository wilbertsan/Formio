import { type BufferGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Evaluator, SUBTRACTION, Brush } from 'three-bvh-csg'
import { createBaseShape, createReinforcementRing, getRingPosition, type RingParams } from './shapes'
import { nameToGeometry } from './textToGeometry'
import type { KeychainParams } from './schema'

export interface BuildKeychainInput {
  font: Font
  params: KeychainParams
  onError?: (message: string) => void
}

export interface BuildKeychainResult {
  base: BufferGeometry
  text: BufferGeometry
}

const ENGRAVE_EPSILON = 0.2

function translatedShape(shape: Shape, x: number, y: number): Shape {
  const pts = shape.getPoints()
  const translated = new Shape(pts.map((p) => new Vector2(p.x + x, p.y + y)))
  for (const hole of shape.holes) {
    const holePts = hole.getPoints()
    const translatedHole = new Path(holePts.map((p) => new Vector2(p.x + x, p.y + y)))
    translated.holes.push(translatedHole)
  }
  return translated
}

function buildScaledText({
  font,
  name,
  textSize,
  targetWidth,
  depth,
}: {
  font: Font
  name: string
  textSize: number
  targetWidth: number
  depth: number
}): BufferGeometry {
  const geometry = nameToGeometry({ font, name, size: textSize, depth })
  geometry.computeBoundingBox()
  const naturalWidth = geometry.boundingBox
    ? geometry.boundingBox.max.x - geometry.boundingBox.min.x
    : 0
  if (naturalWidth > targetWidth && naturalWidth > 0) {
    const scale = targetWidth / naturalWidth
    geometry.scale(scale, scale, 1)
    geometry.center()
  }
  return geometry
}

export function buildKeychain({ font, params, onError }: BuildKeychainInput): BuildKeychainResult {
  const ring: RingParams = {
    position: params.ringPosition,
    innerDiameter: params.ringInnerDiameter,
    thickness: params.ringThickness,
    embedding: params.ringEmbedding,
    lateralOffset: params.ringLateralOffset,
    radialOffset: params.ringRadialOffset,
  }
  const baseShape = createBaseShape(params.baseShape, params.width, params.width, ring)

  const baseGeometry = new ExtrudeGeometry(baseShape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 1,
  })

  const ringCenter = getRingPosition(params.baseShape, params.width, params.width, ring)
  const reinforcementShape = translatedShape(
    createReinforcementRing(ring),
    ringCenter.x,
    ringCenter.y,
  )
  const reinforcementGeometry = new ExtrudeGeometry(reinforcementShape, {
    depth: params.thickness,
    bevelEnabled: false,
  })

  const mergedBase = mergeGeometries([baseGeometry, reinforcementGeometry]) ?? baseGeometry

  const availableWidth = params.width - 2 * params.borderWidth
  const targetWidth = Math.min(params.textWidth, availableWidth)

  if (params.textMode === 'raised') {
    const textGeometry = buildScaledText({
      font,
      name: params.name,
      textSize: params.textSize,
      targetWidth,
      depth: params.letterHeight,
    })
    textGeometry.translate(0, 0, params.thickness - 0.01)
    mergedBase.computeVertexNormals()
    return { base: mergedBase, text: textGeometry }
  }

  try {
    const textGeometry = buildScaledText({
      font,
      name: params.name,
      textSize: params.textSize,
      targetWidth,
      depth: params.letterHeight + ENGRAVE_EPSILON,
    })
    textGeometry.translate(0, 0, params.thickness)
    const evaluator = new Evaluator()
    const result = evaluator.evaluate(new Brush(mergedBase), new Brush(textGeometry), SUBTRACTION)
    result.geometry.computeVertexNormals()
    return { base: result.geometry, text: textGeometry }
  } catch {
    onError?.('Falha na gravação; usando relevo')
    const fallback = buildScaledText({
      font,
      name: params.name,
      textSize: params.textSize,
      targetWidth,
      depth: params.letterHeight,
    })
    fallback.translate(0, 0, params.thickness - 0.01)
    mergedBase.computeVertexNormals()
    return { base: mergedBase, text: fallback }
  }
}
