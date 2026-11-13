import { ExtrudeGeometry, type BufferGeometry } from 'three'
import { roundedRectPath, roundedRectShape } from './shapes'
import { MINIMUM_FEATURE_MM, type ThermoformerGeometryParams } from './schema'

export function buildBase(params: ThermoformerGeometryParams): BufferGeometry {
  const height = Math.max(0.2, params.baseHeight)

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

  // Canto interno vivo (raio desprezível) não tem folga para arredondar.
  const sharpInner = innerRadius <= 0.01
  // Margem de 0,15 mm para discretização dos arcos e clamp de raios.
  const maxBevelByRing = Math.max(0, (params.baseThickness - MINIMUM_FEATURE_MM) / 2 - 0.15)
  // Com canto interno vivo, o bevel amplia o furo e encolhe o raio externo da
  // tampa ao mesmo tempo; no canto da tampa o anel cai na diagonal. Como
  // baseCornerRadius <= baseThickness, limitar o bevel por
  // (baseCornerRadius - MINIMUM_FEATURE_MM) / (1 + sqrt(2)) mantém o anel de
  // canto com pelo menos MINIMUM_FEATURE_MM.
  const cornerBevelLimit = sharpInner
    ? Math.max(0, (params.baseCornerRadius - MINIMUM_FEATURE_MM) / (1 + Math.SQRT2))
    : Number.POSITIVE_INFINITY
  const bevel = Math.min(
    params.edgeChamfer,
    height * 0.4,
    params.baseThickness * 0.5,
    maxBevelByRing,
    cornerBevelLimit,
  )
  // Abaixo desse valor o bevel degenera e o ExtrudeGeometry já o desabilita.
  const effectiveBevel = bevel > 0.01 ? bevel : 0

  // ExtrudeGeometry expande o contorno em `bevelSize` no meio e acrescenta
  // `bevelThickness` em cada ponta. Compensamos contorno, furo e profundidade
  // para preservar dimensões externas, abertura nominal e altura.
  const shape = roundedRectShape(
    outerWidth - 2 * effectiveBevel,
    outerDepth - 2 * effectiveBevel,
    params.baseCornerRadius - effectiveBevel,
  )
  // Com canto interno vivo, somar o bevel criaria pontos de canto quase
  // coincidentes no furo e quebraria a manifoldness; mantemos o canto vivo.
  const holeRadius = sharpInner ? 0 : innerRadius + effectiveBevel
  shape.holes.push(roundedRectPath(
    innerWidth + 2 * effectiveBevel,
    innerDepth + 2 * effectiveBevel,
    holeRadius,
  ))

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
