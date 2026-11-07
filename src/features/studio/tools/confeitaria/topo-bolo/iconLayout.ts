import { buildSvgIconGeometry } from '../shared/svgToIconShape'
import { fitScaleToOutline, outlineSpec, type PlateBounds } from './placement'
import type { CakeTopperParams } from './schema'

export const ICON_MARGIN = 1

export interface HalfSize {
  halfWidth: number
  halfHeight: number
}

// Meias-extensões reais do ícone gerado (inclui traço, dilatação e bevel).
export function iconGeometryHalfSize(
  svgIcon: string | null,
  width: number,
  height: number,
  iconScale: number,
): HalfSize | null {
  if (!svgIcon) return null
  const maxRadius = (Math.min(width, height) / 3) * iconScale
  const geometry = buildSvgIconGeometry({
    svg: svgIcon,
    maxRadius,
    lineWidth: 1,
    iconScale: 1,
    depth: 1,
  })
  if (!geometry) return null
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  geometry.dispose()
  if (!box) return null
  return {
    halfWidth: (box.max.x - box.min.x) / 2,
    halfHeight: (box.max.y - box.min.y) / 2,
  }
}

// Encolhe as meias-extensões até o canto caber no contorno recuado.
export function fitIconHalfSize(
  raw: HalfSize | null,
  params: CakeTopperParams,
  plate: PlateBounds,
): HalfSize | null {
  if (!raw) return null
  const factor = fitScaleToOutline(
    outlineSpec(params, plate, ICON_MARGIN),
    raw.halfWidth,
    raw.halfHeight,
  )
  if (factor >= 1) return raw
  return {
    halfWidth: raw.halfWidth * factor,
    halfHeight: raw.halfHeight * factor,
  }
}
