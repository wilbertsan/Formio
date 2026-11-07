import { BufferAttribute, ExtrudeGeometry, type BufferGeometry } from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { svgPatternShapes } from '../shared/svgPattern'
import type { ParsedSvg } from '../shared/svgToIconShape'
import { pathsToShapes } from '../shared/textOutline'
import {
  isStaggered, motifShapes, MOTIF_MIN_THICKNESS, type MotifShape,
} from './patterns'
import {
  buildPatternPaths, computeReliefLayout, fitMotif, motifSpan, scaleMotif,
} from './reliefLayout'
import {
  MIN_FEATURE_MM, PATTERN_FILL_RATIO, RELIEF_BEVEL_MM,
  type PatternMotif, type TextureRollerParams,
} from './schema'

const EMBED_MM = 0.1

/**
 * A curvatura (X, arco, raio) inverte a orientação do plano desenrolado.
 * Restaura o winding para que tampas e paredes do relevo apontem para fora.
 */
function flipWinding(geometry: BufferGeometry): void {
  const index = geometry.getIndex()
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1)
      index.setX(i + 1, index.getX(i + 2))
      index.setX(i + 2, b)
    }
    index.needsUpdate = true
    return
  }

  const position = geometry.getAttribute('position')
  if (!(position instanceof BufferAttribute)) return
  const array = position.array as Float32Array
  for (let i = 0; i + 8 < array.length; i += 9) {
    for (let k = 0; k < 3; k++) {
      const second = i + 3 + k
      const third = i + 6 + k
      const temp = array[second]
      array[second] = array[third]
      array[third] = temp
    }
  }
  position.needsUpdate = true
}

export function buildRelief(
  params: TextureRollerParams,
  parsedSvg?: ParsedSvg | null,
): BufferGeometry | null {
  const layout = computeReliefLayout(params)
  const isSvg = params.patternSource === 'svg'

  const shapes = isSvg
    ? svgPatternShapes(parsedSvg ?? null, {
        targetSpan: PATTERN_FILL_RATIO * layout.cellSpan * params.patternScale,
        minFeatureMm: MIN_FEATURE_MM,
      })
    : motifShapes(params.patternFamily, params.patternMotif as PatternMotif)
  if (shapes.length === 0) return null

  let prepared: MotifShape[] = shapes
  let dilation = 0
  let staggered = false

  if (!isSvg) {
    const motif = params.patternMotif as PatternMotif
    const fit = fitMotif(
      motifSpan(shapes),
      MOTIF_MIN_THICKNESS[motif],
      layout.cellSpan * params.patternScale,
    )
    prepared = scaleMotif(shapes, fit.scale)
    dilation = fit.dilation
    staggered = isStaggered(motif)
  }

  const paths = buildPatternPaths({
    params,
    layout,
    shapes: prepared,
    dilation,
    staggered,
  })
  if (paths.length === 0) return null

  const flatShapes = pathsToShapes(paths)
  if (flatShapes.length === 0) return null

  // SVG mantém o traço original sem chanfro; motivos internos recebem chanfro.
  const bevel = !isSvg
  const extrusions = flatShapes.map((shape) => new ExtrudeGeometry(shape, {
    depth: params.reliefDepth + EMBED_MM,
    bevelEnabled: bevel,
    bevelThickness: RELIEF_BEVEL_MM,
    bevelSize: RELIEF_BEVEL_MM,
    bevelSegments: 2,
  }))
  const merged = mergeGeometries(extrusions)
  extrusions.forEach((geometry) => geometry.dispose())
  if (!merged) return null

  merged.deleteAttribute('uv')
  merged.computeBoundingBox()
  merged.translate(0, 0, params.reliefDepth - merged.boundingBox!.max.z)

  // Curva o plano no cilindro: X vira eixo, Y vira arco e Z vira raio.
  const position = merged.getAttribute('position')
  const radius = params.diameter / 2
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const arc = position.getY(i)
    const z = position.getZ(i)
    const angle = arc / radius
    const r = radius + z
    position.setXYZ(i, x, r * Math.cos(angle), r * Math.sin(angle))
  }
  position.needsUpdate = true

  flipWinding(merged)

  const creased = toCreasedNormals(merged, Math.PI / 6)
  merged.dispose()
  creased.setIndex(Array.from({ length: creased.getAttribute('position').count }, (_, i) => i))
  return creased
}
