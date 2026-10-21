import { BufferAttribute, BufferGeometry } from 'three'
import type { BuildTextureRollerResult } from './buildTextureRoller'

export interface SerializedGroup {
  start: number
  count: number
  materialIndex?: number
}

export interface SerializedGeometry {
  position: Float32Array
  normal: Float32Array
  index: Uint32Array | null
  groups: SerializedGroup[]
}

export interface SerializedBuildResult {
  roller: SerializedGeometry
}

function floatArray(geometry: BufferGeometry, name: 'position' | 'normal'): Float32Array {
  const attribute = geometry.getAttribute(name)
  return attribute ? (attribute.array as Float32Array).slice() : new Float32Array(0)
}

export function serializeGeometry(geometry: BufferGeometry): { data: SerializedGeometry; transfer: ArrayBuffer[] } {
  const position = floatArray(geometry, 'position')
  const normal = floatArray(geometry, 'normal')
  const indexAttribute = geometry.getIndex()
  const index = indexAttribute ? new Uint32Array(indexAttribute.array).slice() : null

  const transfer: ArrayBuffer[] = [position.buffer as ArrayBuffer, normal.buffer as ArrayBuffer]
  if (index) transfer.push(index.buffer as ArrayBuffer)

  const groups = geometry.groups.map((group) => ({
    start: group.start,
    count: group.count,
    materialIndex: group.materialIndex,
  }))

  return { data: { position, normal, index, groups }, transfer }
}

export function deserializeGeometry(data: SerializedGeometry): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.position, 3))
  if (data.normal.length > 0) geometry.setAttribute('normal', new BufferAttribute(data.normal, 3))
  if (data.index) geometry.setIndex(new BufferAttribute(data.index, 1))
  for (const group of data.groups) {
    geometry.addGroup(group.start, group.count, group.materialIndex)
  }
  return geometry
}

export function serializeBuildResult(result: BuildTextureRollerResult): { data: SerializedBuildResult; transfer: ArrayBuffer[] } {
  const serialized = serializeGeometry(result.roller)
  return { data: { roller: serialized.data }, transfer: serialized.transfer }
}

export function deserializeBuildResult(data: SerializedBuildResult): BuildTextureRollerResult {
  return { roller: deserializeGeometry(data.roller) }
}
