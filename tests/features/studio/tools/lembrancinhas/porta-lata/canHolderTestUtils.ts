import process from 'node:process'
import {
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  type BufferGeometry,
} from 'three'
import { FontLoader, type Font, type FontData } from 'three/examples/jsm/loaders/FontLoader.js'
import helvetikerRegular from '@/assets/fonts/helvetiker_regular.typeface.json'
import { findOuterWall } from '@/features/studio/tools/lembrancinhas/porta-lata/buildBody'
import { bodyProfile } from '@/features/studio/tools/lembrancinhas/porta-lata/shapes'
import {
  getInnerDiameter,
  getOuterRadius,
  getTextureEnvelope,
  type CanHolderGeometryParams,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'

export function realFont(): Font {
  return new FontLoader().parse(helvetikerRegular as unknown as FontData)
}

export const SEAM_EPSILON = 1e-3

/** Vértices duplicados da emenda na faixa e no raio da parede externa. */
export function seamGroups(
  geometry: BufferGeometry,
  params: CanHolderGeometryParams,
): Map<string, number[]> {
  const position = geometry.getAttribute('position')
  const outerR = getOuterRadius(params)
  const envelope = getTextureEnvelope(params)
  const wall = findOuterWall(bodyProfile(params), getInnerDiameter(params) / 2)
  const groups = new Map<string, number[]>()

  for (let i = 0; i < position.count; i++) {
    if (Math.abs(position.getX(i)) > 1e-4 || position.getZ(i) <= 0) continue
    const y = position.getY(i)
    if (y < wall.min - SEAM_EPSILON || y > wall.max + SEAM_EPSILON) continue
    const radius = Math.hypot(position.getX(i), position.getZ(i))
    if (radius < outerR - 1e-4 || radius > outerR + envelope + 1e-3) continue
    const key = y.toFixed(3)
    const group = groups.get(key)
    if (group) group.push(i)
    else groups.set(key, [i])
  }

  return groups
}

/** Node < 22.15 não tem `threadCpuUsage`; cai no CPU do processo. */
export const readCpu =
  typeof process.threadCpuUsage === 'function'
    ? () => process.threadCpuUsage()
    : () => process.cpuUsage()

/** Interseções de um raio com a malha; 0 no eixo prova o furo passante. */
export function rayCrossings(
  geometry: BufferGeometry,
  from: Vector3,
  direction: Vector3,
): number {
  const material = new MeshBasicMaterial()
  const mesh = new Mesh(geometry, material)
  const hits = new Raycaster(from, direction).intersectObject(mesh).length
  material.dispose()
  return hits
}
