import { BufferGeometry, Float32BufferAttribute, Vector2, Vector3 } from 'three'
import { roundedRectPoints } from './shapes'

export interface RoundedRectSpec {
  width: number
  depth: number
  radius: number
}

export interface BodyShellInput {
  outer: RoundedRectSpec
  inner: RoundedRectSpec
  rimInner: RoundedRectSpec
  bottomThickness: number
  height: number
  rimHeight: number
  chamfer: number
  segments: number
}

export interface LidShellInput {
  outer: RoundedRectSpec
  inner: RoundedRectSpec
  totalHeight: number
  plateThickness: number
  chamfer: number
  segments: number
}

const EPS = 1e-6

function insetSpec(spec: RoundedRectSpec, distance: number): RoundedRectSpec {
  const d = Math.max(0, distance)
  return {
    width: Math.max(0.2, spec.width - 2 * d),
    depth: Math.max(0.2, spec.depth - 2 * d),
    radius: Math.max(0, spec.radius - d),
  }
}

function loopAt(spec: RoundedRectSpec, y: number, segments: number): Vector3[] {
  return roundedRectPoints(spec.width, spec.depth, spec.radius, segments).map(
    (point: Vector2) => new Vector3(point.x, y, point.y),
  )
}

function horizontalReference(mid: Vector3, inward: boolean): Vector3 {
  const reference = inward
    ? new Vector3(-mid.x, 0, -mid.z)
    : new Vector3(mid.x, 0, mid.z)
  if (reference.lengthSq() < EPS) reference.set(0, 0, 1)
  return reference.normalize()
}

class TriangleBuilder {
  private readonly positions: number[] = []

  triangle(a: Vector3, b: Vector3, c: Vector3, reference: Vector3): void {
    let second = b
    let third = c
    const normal = new Vector3()
      .subVectors(second, a)
      .cross(new Vector3().subVectors(third, a))
    // Anéis coincidentes geram quads de área zero; isClosed detecta lacunas reais.
    if (normal.lengthSq() < 1e-12) return
    if (normal.dot(reference) < 0) {
      const swap = second
      second = third
      third = swap
    }
    this.positions.push(
      a.x, a.y, a.z,
      second.x, second.y, second.z,
      third.x, third.y, third.z,
    )
  }

  quad(a0: Vector3, a1: Vector3, b1: Vector3, b0: Vector3, reference: Vector3): void {
    this.triangle(a0, a1, b1, reference)
    this.triangle(a0, b1, b0, reference)
  }

  fan(loop: Vector3[], center: Vector3, reference: Vector3): void {
    for (let i = 0; i < loop.length; i++) {
      this.triangle(center, loop[i], loop[(i + 1) % loop.length], reference)
    }
  }

  annulus(outer: Vector3[], inner: Vector3[], reference: Vector3): void {
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length
      this.quad(outer[i], outer[j], inner[j], inner[i], reference)
    }
  }

  wall(a: Vector3[], b: Vector3[], inward: boolean): void {
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length
      const mid = new Vector3().addVectors(a[i], a[j]).multiplyScalar(0.5)
      this.quad(a[i], a[j], b[j], b[i], horizontalReference(mid, inward))
    }
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3))
    geometry.computeVertexNormals()
    return geometry
  }
}

export function buildBodyShell(input: BodyShellInput): BufferGeometry {
  const { outer, inner, rimInner, bottomThickness, height, rimHeight, segments } = input
  const top = height + rimHeight
  const rimGap = Math.max(
    0,
    Math.min((outer.width - rimInner.width) / 2, (outer.depth - rimInner.depth) / 2),
  )
  const chamfer = Math.max(
    0,
    Math.min(
      input.chamfer,
      Math.min(outer.width, outer.depth) * 0.1,
      top * 0.45,
      rimGap * 0.9,
    ),
  )

  const insetOuter = chamfer > EPS ? insetSpec(outer, chamfer) : outer
  const outerBottom = loopAt(insetOuter, 0, segments)
  const outerAfterBottom = loopAt(outer, chamfer, segments)
  const outerBeforeTop = loopAt(outer, top - chamfer, segments)
  const outerTop = loopAt(insetOuter, top, segments)
  const innerBottom = loopAt(inner, bottomThickness, segments)
  const innerTop = loopAt(inner, height, segments)
  const rimBottom = loopAt(rimInner, height, segments)
  const rimTop = loopAt(rimInner, top, segments)

  const builder = new TriangleBuilder()
  builder.fan(outerBottom, new Vector3(0, 0, 0), new Vector3(0, -1, 0))
  if (chamfer > EPS) builder.wall(outerBottom, outerAfterBottom, false)
  builder.wall(outerAfterBottom, outerBeforeTop, false)
  if (chamfer > EPS) builder.wall(outerBeforeTop, outerTop, false)
  builder.wall(innerBottom, innerTop, true)
  builder.fan(innerBottom, new Vector3(0, bottomThickness, 0), new Vector3(0, 1, 0))

  if (rimHeight > EPS) {
    builder.annulus(innerTop, rimBottom, new Vector3(0, -1, 0))
    builder.wall(rimBottom, rimTop, true)
    builder.annulus(outerTop, rimTop, new Vector3(0, 1, 0))
  } else {
    builder.annulus(outerTop, innerTop, new Vector3(0, 1, 0))
  }

  return builder.build()
}

export function buildLidShell(input: LidShellInput): BufferGeometry {
  const { outer, inner, totalHeight, plateThickness, segments } = input
  const top = Math.max(0.2, totalHeight)
  const effectivePlateThickness = Math.min(plateThickness, Math.max(0.1, top - 0.1))
  const plateBottom = Math.max(0.1, top - effectivePlateThickness)
  const chamfer = Math.max(
    0,
    Math.min(input.chamfer, Math.min(outer.width, outer.depth) * 0.1, top * 0.45),
  )

  const insetOuter = chamfer > EPS ? insetSpec(outer, chamfer) : outer
  const outerBottom = loopAt(insetOuter, 0, segments)
  const outerAfterBottom = loopAt(outer, chamfer, segments)
  const outerBeforeTop = loopAt(outer, top - chamfer, segments)
  const outerTop = loopAt(insetOuter, top, segments)
  const innerBottom = loopAt(inner, 0, segments)
  const innerTop = loopAt(inner, plateBottom, segments)

  const builder = new TriangleBuilder()
  builder.annulus(outerBottom, innerBottom, new Vector3(0, -1, 0))
  if (chamfer > EPS) builder.wall(outerBottom, outerAfterBottom, false)
  builder.wall(outerAfterBottom, outerBeforeTop, false)
  if (chamfer > EPS) builder.wall(outerBeforeTop, outerTop, false)
  builder.wall(innerBottom, innerTop, true)
  builder.fan(innerTop, new Vector3(0, plateBottom, 0), new Vector3(0, -1, 0))
  builder.fan(outerTop, new Vector3(0, top, 0), new Vector3(0, 1, 0))

  return builder.build()
}
