import { BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getUsableRegion, resolveContentGeometry } from './autoFit'
import { createStandGeometry, getEffectiveDepth } from './shapes'
import type { FontStyle, PhotoStandParams } from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'

export interface BuildPhotoStandInput {
  params: PhotoStandParams
  font?: Font
  fonts?: Partial<Record<FontStyle, Font>>
  parsedSvgs?: Record<string, ParsedSvg | null>
  onError?: (message: string) => void
}

export interface BuildContentItem {
  id: string
  halfWidth: number
  halfHeight: number
}

export interface BuildPhotoStandResult {
  base: BufferGeometry
  content: BufferGeometry | null
  contentItems: BuildContentItem[]
}

function resolveFont(
  fonts: Partial<Record<FontStyle, Font>> | undefined,
  font: Font | undefined,
  style: FontStyle,
): Font | undefined {
  return fonts?.[style] ?? font
}

function mergeOrFirst(
  geometries: BufferGeometry[],
  onError?: (message: string) => void,
): BufferGeometry {
  const merged = mergeGeometries(geometries)
  if (merged) return merged
  onError?.('Falha ao combinar geometrias')
  return geometries[0] ?? new BufferGeometry()
}

function disposeAll(geometries: BufferGeometry[], keep?: BufferGeometry): void {
  for (const geometry of geometries) {
    if (geometry !== keep) geometry.dispose()
  }
}

export function buildPhotoStand({
  params,
  font,
  fonts,
  parsedSvgs,
  onError,
}: BuildPhotoStandInput): BuildPhotoStandResult {
  const base = createStandGeometry(params)

  const region = getUsableRegion(params)
  const contentZ = getEffectiveDepth(params) / 2 - 0.01
  const contentGeometries: BufferGeometry[] = []
  const contentItems: BuildContentItem[] = []

  for (const item of params.contents) {
    const itemFont = item.kind === 'text' && item.content.trim()
      ? resolveFont(fonts, font, item.fontStyle)
      : undefined
    const fitted = resolveContentGeometry(
      item,
      { region, font: itemFont },
      parsedSvgs?.[item.id],
    )

    if (!fitted) {
      contentItems.push({
        id: item.id,
        halfWidth: 0,
        halfHeight: 0,
      })
      continue
    }

    fitted.geometry.translate(fitted.x, fitted.y, contentZ)
    contentItems.push({
      id: item.id,
      halfWidth: fitted.halfWidth,
      halfHeight: fitted.halfHeight,
    })
    contentGeometries.push(fitted.geometry)
  }

  const content = contentGeometries.length > 0
    ? mergeOrFirst(contentGeometries, onError)
    : null
  disposeAll(contentGeometries, content ?? undefined)
  content?.computeVertexNormals()

  return { base, content, contentItems }
}
