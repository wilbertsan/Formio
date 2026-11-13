import { Path, Shape, Vector2 } from 'three'

function traceRoundedRect(path: Path, width: number, depth: number, radius: number): void {
  const halfWidth = width / 2
  const halfDepth = depth / 2
  const r = Math.max(0, Math.min(radius, halfWidth, halfDepth))

  if (r <= 1e-6) {
    path.moveTo(-halfWidth, -halfDepth)
    path.lineTo(halfWidth, -halfDepth)
    path.lineTo(halfWidth, halfDepth)
    path.lineTo(-halfWidth, halfDepth)
    path.lineTo(-halfWidth, -halfDepth)
    return
  }

  path.moveTo(-halfWidth + r, -halfDepth)
  path.lineTo(halfWidth - r, -halfDepth)
  path.absarc(halfWidth - r, -halfDepth + r, r, -Math.PI / 2, 0, false)
  path.lineTo(halfWidth, halfDepth - r)
  path.absarc(halfWidth - r, halfDepth - r, r, 0, Math.PI / 2, false)
  path.lineTo(-halfWidth + r, halfDepth)
  path.absarc(-halfWidth + r, halfDepth - r, r, Math.PI / 2, Math.PI, false)
  path.lineTo(-halfWidth, -halfDepth + r)
  path.absarc(-halfWidth + r, -halfDepth + r, r, Math.PI, (3 * Math.PI) / 2, false)
}

export function roundedRectShape(width: number, depth: number, radius: number): Shape {
  const shape = new Shape()
  traceRoundedRect(shape, width, depth, radius)
  return shape
}

export function roundedRectPath(width: number, depth: number, radius: number): Path {
  const path = new Path()
  traceRoundedRect(path, width, depth, radius)
  return path
}

function resampleClosedLoop(points: Vector2[], count: number): Vector2[] {
  const totalPoints = points.length
  if (totalPoints === 0) return []
  if (totalPoints === 1) return Array.from({ length: count }, () => points[0].clone())

  const lengths: number[] = []
  let total = 0
  for (let i = 0; i < totalPoints; i++) {
    const length = points[i].distanceTo(points[(i + 1) % totalPoints])
    lengths.push(length)
    total += length
  }
  if (total < 1e-6) return Array.from({ length: count }, () => points[0].clone())

  const step = total / count
  const result: Vector2[] = []
  let segment = 0
  let segmentStart = 0

  for (let i = 0; i < count; i++) {
    const target = i * step
    while (segment < totalPoints - 1 && segmentStart + lengths[segment] < target) {
      segmentStart += lengths[segment]
      segment++
    }
    const t = lengths[segment] > 1e-9 ? (target - segmentStart) / lengths[segment] : 0
    const a = points[segment]
    const b = points[(segment + 1) % totalPoints]
    result.push(new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t))
  }

  return result
}

/**
 * Amostra o contorno arredondado com contagem fixa por canto e por aresta.
 * Retorna exatamente `4 * (cornerSegments + edgeSegments)` pontos em CCW.
 * Para raio 0 os pontos do canto coincidem; o TriangleBuilder descarta quads
 * de área zero.
 */
export function roundedRectExactPoints(
  width: number,
  depth: number,
  radius: number,
  cornerSegments: number,
  edgeSegments: number,
): Vector2[] {
  const halfWidth = width / 2
  const halfDepth = depth / 2
  const r = Math.max(0, Math.min(radius, halfWidth, halfDepth))
  const points: Vector2[] = []

  const pushEdge = (ax: number, ay: number, bx: number, by: number): void => {
    for (let j = 0; j < edgeSegments; j++) {
      const t = j / edgeSegments
      points.push(new Vector2(ax + (bx - ax) * t, ay + (by - ay) * t))
    }
  }

  const pushCorner = (cx: number, cy: number, startAngle: number): void => {
    for (let k = 0; k < cornerSegments; k++) {
      const angle = startAngle + (k / cornerSegments) * (Math.PI / 2)
      points.push(new Vector2(cx + r * Math.cos(angle), cy + r * Math.sin(angle)))
    }
  }

  pushEdge(-halfWidth + r, -halfDepth, halfWidth - r, -halfDepth)
  pushCorner(halfWidth - r, -halfDepth + r, -Math.PI / 2)
  pushEdge(halfWidth, -halfDepth + r, halfWidth, halfDepth - r)
  pushCorner(halfWidth - r, halfDepth - r, 0)
  pushEdge(halfWidth - r, halfDepth, -halfWidth + r, halfDepth)
  pushCorner(-halfWidth + r, halfDepth - r, Math.PI / 2)
  pushEdge(-halfWidth, halfDepth - r, -halfWidth, -halfDepth + r)
  pushCorner(-halfWidth + r, -halfDepth + r, Math.PI)

  return points
}

export function roundedRectPoints(
  width: number,
  depth: number,
  radius: number,
  count: number,
): Vector2[] {
  const shape = roundedRectShape(width, depth, radius)
  const divisions = Math.max(8, Math.ceil(count / 8))
  const extracted = shape.extractPoints(divisions).shape
  const points: Vector2[] = []

  for (const point of extracted) {
    const last = points[points.length - 1]
    if (!last || last.distanceTo(point) > 1e-6) points.push(point.clone())
  }
  if (points.length > 1 && points[0].distanceTo(points[points.length - 1]) <= 1e-6) {
    points.pop()
  }

  return resampleClosedLoop(points, count)
}
