import type { BufferGeometry } from 'three'

/** Reduz a geometria para caber na largura alvo; nunca amplia. */
export function fitGeometryWidth(geometry: BufferGeometry, targetWidth: number): BufferGeometry {
  geometry.computeBoundingBox()
  const boundingBox = geometry.boundingBox
  const naturalWidth = boundingBox ? boundingBox.max.x - boundingBox.min.x : 0
  if (naturalWidth > targetWidth && naturalWidth > 0) {
    const scale = targetWidth / naturalWidth
    geometry.scale(scale, scale, 1)
    geometry.center()
  }
  return geometry
}
