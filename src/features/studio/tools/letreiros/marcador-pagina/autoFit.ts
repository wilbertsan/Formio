import type { BufferGeometry } from 'three'

/**
 * Reduz apenas a largura para caber no alvo; nunca amplia e preserva a altura.
 * A altura fica independente da largura (o texto pode ser esticado/achatado).
 */
export function fitGeometryWidth(geometry: BufferGeometry, targetWidth: number): BufferGeometry {
  geometry.computeBoundingBox()
  const boundingBox = geometry.boundingBox
  const naturalWidth = boundingBox ? boundingBox.max.x - boundingBox.min.x : 0
  if (naturalWidth > targetWidth && naturalWidth > 0) {
    const scale = targetWidth / naturalWidth
    geometry.scale(scale, 1, 1)
    geometry.center()
  }
  return geometry
}
