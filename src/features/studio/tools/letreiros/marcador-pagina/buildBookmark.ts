import { BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import { nameToGeometry } from './textToGeometry'
import { fitGeometryWidth } from './autoFit'
import { TEXT_MARGIN, TEXT_ROTATION } from './positioning'
import { buildBookmarkBase } from './shapes'
import { buildPatternGeometry } from './patterns'
import { createJointBars, splitBaseCenterX, splitTextCenterX } from './joint'
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
  let baseGeometry = buildBookmarkBase({
    ...params,
    centerX: splitBaseCenterX(params.width),
  })
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
  const textWidth = bb.max.y - bb.min.y
  const x = splitTextCenterX(params.text.relief)
  const y = 0

  // O texto é centrado na borda da base: metade acima, metade abaixo.
  textGeometry.translate(x, y, params.thickness / 2)

  const barsGeometry = createJointBars(textWidth, params.thickness, params.text.relief)
  const mergedText = mergeGeometries([textGeometry, barsGeometry])
  barsGeometry.dispose()
  if (mergedText) {
    textGeometry.dispose()
  }
  const text = mergedText ?? textGeometry

  text.computeVertexNormals()
  baseGeometry.computeVertexNormals()

  return { base: baseGeometry, text }
}

export function disposeBookmarkResult(result: BuildBookmarkResult): void {
  result.base.dispose()
  result.text.dispose()
}
