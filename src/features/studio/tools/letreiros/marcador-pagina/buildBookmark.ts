import { BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import { nameToGeometry } from './textToGeometry'
import { fitGeometryWidth } from './autoFit'
import {
  TEXT_MARGIN,
  TEXT_ROTATION,
  TEXT_Z_OFFSET,
  bookmarkBaseCenterX,
  fixedTextX,
} from './positioning'
import { buildBookmarkBase } from './shapes'
import { buildPatternGeometry } from './patterns'
import type { BookmarkParams, FontStyle } from './schema'

export interface BuildBookmarkInput {
  font?: Font
  fonts?: Partial<Record<FontStyle, Font>>
  params: BookmarkParams
  parsedSvg?: ParsedSvg | null
}

export interface BuildBookmarkResult {
  base: BufferGeometry
  text: BufferGeometry
}

function resolveFont(
  fonts: Partial<Record<FontStyle, Font>> | undefined,
  font: Font | undefined,
  style: FontStyle,
): Font {
  if (fonts?.[style]) return fonts[style]!
  if (font) return font
  throw new Error(`No font provided for style "${style}"`)
}

export function buildBookmark({
  font,
  fonts,
  params,
  parsedSvg,
}: BuildBookmarkInput): BuildBookmarkResult {
  const baseCenterX = bookmarkBaseCenterX(params.width, params.text.relief)
  let baseGeometry = buildBookmarkBase({ ...params, centerX: baseCenterX })
  const patternGeometry = buildPatternGeometry(params, parsedSvg ?? null)
  if (patternGeometry) {
    const mergedBase = mergeGeometries([baseGeometry, patternGeometry])
    patternGeometry.dispose()
    if (mergedBase) {
      baseGeometry.dispose()
      baseGeometry = mergedBase
    }
  }

  const availableLength = params.length - 2 * TEXT_MARGIN
  const resolvedFont = resolveFont(fonts, font, params.text.fontStyle)

  const textGeometry = nameToGeometry({
    font: resolvedFont,
    name: params.text.content,
    size: params.text.height,
    depth: params.text.relief,
  })

  fitGeometryWidth(textGeometry, Math.min(params.text.width, availableLength))
  // Texto em pé, perpendicular à base: a largura local passa a correr no
  // comprimento (Y), a altura sobe em Z e a profundidade vira a espessura
  // da parede no eixo X.
  textGeometry.rotateZ(TEXT_ROTATION)
  textGeometry.rotateY(TEXT_ROTATION)

  textGeometry.computeBoundingBox()
  const bb = textGeometry.boundingBox!
  const x = fixedTextX(params.width, params.text.relief)
  const y = 0

  // O texto começa no fundo da base (z = 0) e sobe no eixo Z, com uma pequena
  // sobreposição para garantir a fusão das peças na impressão.
  textGeometry.translate(x, y, -TEXT_Z_OFFSET - bb.min.z)

  textGeometry.computeVertexNormals()
  baseGeometry.computeVertexNormals()

  return { base: baseGeometry, text: textGeometry }
}

export function disposeBookmarkResult(result: BuildBookmarkResult): void {
  result.base.dispose()
  result.text.dispose()
}
