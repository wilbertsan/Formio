import { Path, Shape } from 'three'

export function circleShape(radius: number): Shape {
  const shape = new Shape()
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
  return shape
}

/**
 * Desvio angular mínimo dos favos. Sem ele, vértices de favos vizinhos ficam
 * exatamente colineares e o Earcut (ExtrudeGeometry) deixa os caps abertos.
 * Mesmo motivo do epsilon usado no painel da Caixa Personalizada.
 */
const HEXAGON_ANGLE_EPSILON = 0.001

export function hexagonPath(x: number, y: number, radius: number): Path {
  const path = new Path()

  for (let index = 0; index < 6; index++) {
    const angle = (Math.PI / 3) * index + HEXAGON_ANGLE_EPSILON
    const px = x + radius * Math.cos(angle)
    const py = y + radius * Math.sin(angle)
    if (index === 0) path.moveTo(px, py)
    else path.lineTo(px, py)
  }

  path.closePath()
  return path
}
