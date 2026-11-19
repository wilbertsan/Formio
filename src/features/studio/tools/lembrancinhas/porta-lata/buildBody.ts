import { BufferAttribute, BufferGeometry, LatheGeometry, Vector2 } from 'three'
import { removeDegenerateTriangles } from './geometryCleanup'
import { bodyProfile } from './shapes'
import { textureDisplacement } from './texture'
import {
  HOLDER_SEGMENTS,
  TEXTURE_RADIAL_SEGMENTS,
  TEXTURE_STEP_MM,
  getInnerDiameter,
  type CanHolderGeometryParams,
} from './schema'

export interface OuterWall {
  /** Índice do ponto inicial do segmento vertical da parede. */
  index: number
  radius: number
  min: number
  max: number
}

/**
 * Parede externa: o segmento vertical mais longo fora da cavidade. Com anéis é
 * o trecho entre eles; sem anéis, vai da base ao chanfro da borda.
 */
export function findOuterWall(profile: Vector2[], innerRadius: number): OuterWall {
  let wall: OuterWall | null = null
  for (let index = 0; index < profile.length - 1; index++) {
    const start = profile[index]
    const end = profile[index + 1]
    if (Math.abs(start.x - end.x) > 1e-6) continue
    if (start.x <= innerRadius + 1e-6) continue
    const min = Math.min(start.y, end.y)
    const max = Math.max(start.y, end.y)
    if (!wall || max - min > wall.max - wall.min) {
      wall = { index, radius: start.x, min, max }
    }
  }
  if (!wall) throw new Error('Perfil sem parede externa')
  return wall
}

function subdivideWall(profile: Vector2[], wall: OuterWall): Vector2[] {
  const steps = Math.max(1, Math.ceil((wall.max - wall.min) / TEXTURE_STEP_MM))
  const direction = profile[wall.index + 1].y >= profile[wall.index].y ? 1 : -1
  const points: Vector2[] = []

  profile.forEach((point, index) => {
    points.push(point)
    if (index !== wall.index) return
    for (let step = 1; step < steps; step++) {
      const y = point.y + direction * (wall.max - wall.min) * (step / steps)
      points.push(new Vector2(wall.radius, y))
    }
  })

  return points
}

function displaceWall(
  geometry: BufferGeometry,
  params: CanHolderGeometryParams,
  wall: OuterWall,
): void {
  const position = geometry.getAttribute('position') as BufferAttribute

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    if (y < wall.min - 1e-4 || y > wall.max + 1e-4) continue
    const radius = Math.hypot(x, z)
    if (Math.abs(radius - wall.radius) > 1e-4) continue

    const height = textureDisplacement(params, Math.atan2(z, x), y, wall.min, wall.max)
    if (height <= 0) continue

    const scale = (wall.radius + height) / radius
    position.setX(i, x * scale)
    position.setZ(i, z * scale)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
}

export function buildBody(params: CanHolderGeometryParams): BufferGeometry {
  if (params.textureStyle === 'none') {
    return removeDegenerateTriangles(
      new LatheGeometry(bodyProfile(params), HOLDER_SEGMENTS),
    )
  }

  const profile = bodyProfile(params)
  const wall = findOuterWall(profile, getInnerDiameter(params) / 2)
  const geometry = new LatheGeometry(
    subdivideWall(profile, wall),
    TEXTURE_RADIAL_SEGMENTS,
  )
  displaceWall(geometry, params, wall)
  return removeDegenerateTriangles(geometry)
}
