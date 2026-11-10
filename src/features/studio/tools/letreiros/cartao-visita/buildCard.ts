import { BufferGeometry, ExtrudeGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getUsableRegion, resolveContentGeometry } from './autoFit'
import { createCardShape } from './shapes'
import {
  BASE_BEVEL,
  type CardParams,
  type FontStyle,
} from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'

export interface BuildCardInput {
  params: CardParams
  font?: Font
  fonts?: Partial<Record<FontStyle, Font>>
  parsedSvgs?: Record<string, ParsedSvg | null>
  onError?: (message: string) => void
}

export interface BuildContentItem {
  id: string
  halfWidth: number
  halfHeight: number
  geometry: BufferGeometry | null
}

export interface BuildCardResult {
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

export function buildCard({
  params,
  font,
  fonts,
  parsedSvgs,
  onError,
}: BuildCardInput): BuildCardResult {
  const shape = createCardShape(params.width, params.height, params.cornerRadius)
  const base = new ExtrudeGeometry(shape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: BASE_BEVEL,
    bevelSize: BASE_BEVEL,
    bevelSegments: 1,
  })

  base.computeBoundingBox()
  const baseBB = base.boundingBox
  if (baseBB) {
    base.translate(
      -(baseBB.min.x + baseBB.max.x) / 2,
      -(baseBB.min.y + baseBB.max.y) / 2,
      0,
    )
  }
  base.computeVertexNormals()

  const region = getUsableRegion(params)
  const contentZ = params.thickness + BASE_BEVEL - 0.01
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
        geometry: null,
      })
      continue
    }

    fitted.geometry.translate(fitted.x, fitted.y, contentZ)
    contentItems.push({
      id: item.id,
      halfWidth: fitted.halfWidth,
      halfHeight: fitted.halfHeight,
      geometry: null,
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
