import { BufferAttribute, BufferGeometry } from 'three'
import type { BuildTextureRollerResult } from './buildTextureRoller'

export interface SerializedGeometry {
  position: Float32Array
  normal: Float32Array
  index: Uint32Array | null
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

  return { data: { position, normal, index }, transfer }
}

export function deserializeGeometry(data: SerializedGeometry): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.position, 3))
  if (data.normal.length > 0) geometry.setAttribute('normal', new BufferAttribute(data.normal, 3))
  if (data.index) geometry.setIndex(new BufferAttribute(data.index, 1))
  return geometry
}

export function serializeBuildResult(result: BuildTextureRollerResult): { data: SerializedBuildResult; transfer: ArrayBuffer[] } {
  const serialized = serializeGeometry(result.roller)
  return { data: { roller: serialized.data }, transfer: serialized.transfer }
}

export function deserializeBuildResult(data: SerializedBuildResult): BuildTextureRollerResult {
  return { roller: deserializeGeometry(data.roller) }
}
