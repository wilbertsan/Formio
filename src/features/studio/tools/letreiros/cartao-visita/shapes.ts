import { Shape } from 'three'

/**
 * Contorno retangular centralizado na origem, com cantos arredondados.
 * O raio é limitado à metade do menor lado para não degenerar a forma.
 */
export function createCardShape(width: number, height: number, radius: number): Shape {
  const shape = new Shape()
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2))
  const halfWidth = width / 2
  const halfHeight = height / 2

  if (r <= 0) {
    shape.moveTo(-halfWidth, -halfHeight)
    shape.lineTo(halfWidth, -halfHeight)
    shape.lineTo(halfWidth, halfHeight)
    shape.lineTo(-halfWidth, halfHeight)
    shape.closePath()
    return shape
  }

  shape.moveTo(-halfWidth + r, -halfHeight)
  shape.lineTo(halfWidth - r, -halfHeight)
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + r)
  shape.lineTo(halfWidth, halfHeight - r)
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - r, halfHeight)
  shape.lineTo(-halfWidth + r, halfHeight)
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - r)
  shape.lineTo(-halfWidth, -halfHeight + r)
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + r, -halfHeight)
  shape.closePath()

  return shape
}
