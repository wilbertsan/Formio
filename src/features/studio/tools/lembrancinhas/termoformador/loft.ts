import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  ShapeUtils,
  Vector2,
} from 'three'
import {
  pathsToShapes,
  type ClipperPoint,
} from '../../confeitaria/shared/textOutline'

function shapeOf(paths: ClipperPoint[][]): Shape | null {
  const shapes = pathsToShapes(paths)
  return shapes.length === 1 ? shapes[0] : null
}

/**
 * Extruda um contorno fechado entre `y` e `y + depth`.
 * Mesmo eixo da tela: o Y do contorno vira -Z.
 */
export function extrudeOutline(
  paths: ClipperPoint[][],
  depth: number,
  y: number,
): BufferGeometry {
  const shape = shapeOf(paths)
  if (!shape) return new BufferGeometry()

  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 48,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, y, 0)
  geometry.computeVertexNormals()
  return geometry
}

function toContour(path: ClipperPoint[]): Vector2[] {
  return path.map((point) => new Vector2(point.X / 1000, point.Y / 1000))
}

/** Remove o ponto de fechamento repetido, se houver. */
function dropClosingPoint(contour: Vector2[]): Vector2[] {
  if (contour.length < 2) return contour
  const first = contour[0]
  const last = contour[contour.length - 1]
  return first.distanceTo(last) < 1e-6 ? contour.slice(0, -1) : contour
}

/**
 * Liga um contorno superior a um inferior com o mesmo número de pontos.
 * O eixo é o mesmo do `buildScreen`: o Y do contorno vira -Z.
 */
export function loftOutline(
  topPaths: ClipperPoint[][],
  bottomPaths: ClipperPoint[][],
  bottomY: number,
  topY: number,
): BufferGeometry {
  const topPath = topPaths[0]
  const bottomPath = bottomPaths[0]
  if (!topPath || !bottomPath) return new BufferGeometry()

  const topContour = dropClosingPoint(toContour(topPath))
  const bottomContour = dropClosingPoint(toContour(bottomPath))
  if (
    topContour.length < 3 ||
    topContour.length !== bottomContour.length
  ) {
    return new BufferGeometry()
  }

  const positions: number[] = []
  const indices: number[] = []

  const push = (x: number, y: number, z: number): number => {
    positions.push(x, y, z)
    return positions.length / 3 - 1
  }

  const topRing: number[] = []
  const bottomRing: number[] = []
  for (let index = 0; index < topContour.length; index++) {
    const top = topContour[index]
    const bottom = bottomContour[index]
    topRing.push(push(top.x, topY, -top.y))
    bottomRing.push(push(bottom.x, bottomY, -bottom.y))
  }

  // O contorno pode vir em qualquer sentido; as laterais acompanham o sinal.
  const counterClockwise = ShapeUtils.area(topContour) > 0
  for (let index = 0; index < topContour.length; index++) {
    const next = (index + 1) % topContour.length
    if (counterClockwise) {
      indices.push(topRing[index], bottomRing[index], bottomRing[next])
      indices.push(topRing[index], bottomRing[next], topRing[next])
    } else {
      indices.push(topRing[index], bottomRing[next], bottomRing[index])
      indices.push(topRing[index], topRing[next], bottomRing[next])
    }
  }

  // O earcut devolve triângulos sempre no mesmo sentido; o topo mantém e o
  // fundo inverte para as duas tampas ficarem voltadas para fora.
  for (const [a, b, c] of ShapeUtils.triangulateShape(topContour, [])) {
    indices.push(topRing[a], topRing[b], topRing[c])
  }
  for (const [a, b, c] of ShapeUtils.triangulateShape(bottomContour, [])) {
    indices.push(bottomRing[a], bottomRing[c], bottomRing[b])
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
