import {
  BufferGeometry,
  Float32BufferAttribute,
  type BufferAttribute,
} from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { shapesToGeometry, textToShapes } from '../../confeitaria/shared/textOutline'
import {
  CONTENT_DEPTH,
  MAX_TEXT_ARC,
  RELIEF_EMBED,
  getOuterRadius,
  getTextBand,
  type CanHolderGeometryParams,
} from './schema'

/**
 * Aresta máxima do relevo plano antes de curvar; limita o sag da corda.
 * O desvio da corda é `edge² / (8·R)`: com 2,5 mm e R ≈ 36 mm dá ≈0,02 mm,
 * então o relevo visível de 1 mm fica em ≈0,98 mm (orçamento de 2%).
 */
const MAX_RELIEF_EDGE = 2.5
const MAX_SUBDIVISIONS = 8

interface Point {
  x: number
  y: number
  z: number
  u: number
  v: number
}

type Triangle = [Point, Point, Point]

/**
 * Escala uniforme (x/y) para o texto caber no arco máximo, preservando o
 * relevo de 1 mm. Retorna 1 quando já cabe.
 */
export function fitRelief(
  width: number,
  centerRadius: number,
  maxArc: number = MAX_TEXT_ARC,
): number {
  if (width <= 0 || centerRadius <= 0) return 1
  const arc = width / centerRadius
  return arc > maxArc ? maxArc / arc : 1
}

function clampCenterY(params: CanHolderGeometryParams, halfHeight: number): number {
  const band = getTextBand(params)
  const minY = band.min + halfHeight
  const maxY = band.max - halfHeight
  if (minY > maxY) return params.textCenterY
  return Math.min(maxY, Math.max(minY, params.textCenterY))
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    u: (a.u + b.u) / 2,
    v: (a.v + b.v) / 2,
  }
}

function rotateTriangle(triangle: Triangle, r: number): Triangle {
  return [
    triangle[r % 3],
    triangle[(r + 1) % 3],
    triangle[(r + 2) % 3],
  ]
}

function distanceSq(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
}

function readTriangles(geometry: BufferGeometry): Triangle[] {
  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  const triangles: Triangle[] = []

  for (let i = 0; i < position.count; i += 3) {
    const point = (index: number): Point => ({
      x: position.getX(index),
      y: position.getY(index),
      z: position.getZ(index),
      u: uv ? uv.getX(index) : 0,
      v: uv ? uv.getY(index) : 0,
    })
    triangles.push([point(i), point(i + 1), point(i + 2)])
  }

  return triangles
}

/**
 * Bisseção conforming das arestas: cada aresta longa é dividida pelo ponto
 * médio e a decisão depende só do comprimento da aresta, então os dois
 * triângulos que a compartilham criam exatamente os mesmos pontos médios — sem
 * T-junctions, ao contrário do TessellateModifier, que abre o mesh.
 */
function splitTriangles(triangles: Triangle[], maxEdge: number): {
  triangles: Triangle[]
  changed: boolean
} {
  const maxEdgeSq = maxEdge ** 2
  const next: Triangle[] = []
  let changed = false

  for (const triangle of triangles) {
    const [p0, p1, p2] = triangle
    const long01 = distanceSq(p0, p1) > maxEdgeSq
    const long12 = distanceSq(p1, p2) > maxEdgeSq
    const long20 = distanceSq(p2, p0) > maxEdgeSq
    const longCount = Number(long01) + Number(long12) + Number(long20)

    if (longCount === 0) {
      next.push(triangle)
      continue
    }
    changed = true

    if (longCount === 1) {
      const rotated = rotateTriangle(triangle, long01 ? 0 : long12 ? 1 : 2)
      const [v0, v1, v2] = rotated
      const m = midpoint(v0, v1)
      next.push([v0, m, v2], [m, v1, v2])
      continue
    }

    if (longCount === 2) {
      const rotation = long12 && long20 ? 1 : long20 && long01 ? 2 : 0
      const [v0, v1, v2] = rotateTriangle(triangle, rotation)
      const m01 = midpoint(v0, v1)
      const m12 = midpoint(v1, v2)
      next.push([v0, m01, m12], [m01, v1, m12], [v0, m12, v2])
      continue
    }

    const m01 = midpoint(p0, p1)
    const m12 = midpoint(p1, p2)
    const m20 = midpoint(p2, p0)
    next.push(
      [p0, m01, m20],
      [m01, p1, m12],
      [m20, m12, p2],
      [m01, m12, m20],
    )
  }

  return { triangles: next, changed }
}

/** Subdivide o relevo plano até nenhuma aresta passar de `maxEdge`. */
function subdivideFlat(geometry: BufferGeometry, maxEdge: number): BufferGeometry {
  // ExtrudeGeometry é não indexada; normaliza entradas indexadas por segurança.
  const source = geometry.index ? geometry.toNonIndexed() : geometry
  const hasUv = source.getAttribute('uv') !== undefined
  let triangles = readTriangles(source)
  if (source !== geometry) source.dispose()

  for (let i = 0; i < MAX_SUBDIVISIONS; i++) {
    const result = splitTriangles(triangles, maxEdge)
    triangles = result.triangles
    if (!result.changed) break
  }

  const positions: number[] = []
  const uvs: number[] = []
  for (const triangle of triangles) {
    for (const point of triangle) {
      positions.push(point.x, point.y, point.z)
      if (hasUv) uvs.push(point.u, point.v)
    }
  }

  const result = new BufferGeometry()
  result.setAttribute('position', new Float32BufferAttribute(positions, 3))
  if (hasUv) result.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  return result
}

export function buildRelief(
  font: Font,
  params: CanHolderGeometryParams,
): BufferGeometry | null {
  const shapes = textToShapes(font, params.text, params.textSize)
  if (shapes.length === 0) return null

  // Extruda CONTENT_DEPTH visível + RELIEF_EMBED: depois do deslocamento de
  // -RELIEF_EMBED a face de trás fica 0,2 mm dentro da parede e a frente a
  // 1 mm acima dela, garantindo união CSG sem faces coplanares.
  const rawFlat = shapesToGeometry(shapes, CONTENT_DEPTH + RELIEF_EMBED, false)
  rawFlat.computeBoundingBox()
  const box = rawFlat.boundingBox!
  const width = box.max.x - box.min.x
  const height = box.max.y - box.min.y
  if (width <= 0 || height <= 0) {
    rawFlat.dispose()
    return null
  }

  const centerRadius = getOuterRadius(params)
  const scale = fitRelief(width, centerRadius)
  const centerX = ((box.min.x + box.max.x) / 2) * scale
  const centerY = ((box.min.y + box.max.y) / 2) * scale
  const halfHeight = (height * scale) / 2
  const centerYGlobal = clampCenterY(params, halfHeight)

  // Escala antes de subdividir: a aresta máxima é medida nos mm finais.
  rawFlat.scale(scale, scale, 1)
  const flat = subdivideFlat(rawFlat, MAX_RELIEF_EDGE)
  rawFlat.dispose()

  const position = flat.getAttribute('position') as BufferAttribute
  for (let i = 0; i < position.count; i++) {
    const localX = position.getX(i) - centerX
    const localY = position.getY(i) - centerY
    const localZ = position.getZ(i)

    const globalY = centerYGlobal + localY
    const radius = getOuterRadius(params) + localZ - RELIEF_EMBED
    // Sinal negativo: mantém a leitura da esquerda para a direita e o winding
    // para fora (um sinal positivo reflete o texto e inverte a orientação).
    const angle = Math.PI - localX / centerRadius

    position.setXYZ(i, radius * Math.cos(angle), globalY, radius * Math.sin(angle))
  }

  flat.computeBoundingBox()
  flat.computeBoundingSphere()
  flat.computeVertexNormals()
  return flat
}
