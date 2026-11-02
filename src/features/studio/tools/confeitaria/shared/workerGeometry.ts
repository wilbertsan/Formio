import { BufferAttribute, BufferGeometry } from 'three'

export interface SerializedGeometry {
  position: Float32Array
  normal: Float32Array
  uv: Float32Array
  index: Uint32Array | null
}

function floatArray(geometry: BufferGeometry, name: 'position' | 'normal' | 'uv'): Float32Array {
  const attribute = geometry.getAttribute(name)
  return attribute ? (attribute.array as Float32Array).slice() : new Float32Array(0)
}

/** Serializa uma BufferGeometry em arrays transferíveis (cópias seguras). */
export function serializeGeometry(geometry: BufferGeometry): { data: SerializedGeometry; transfer: ArrayBuffer[] } {
  const position = floatArray(geometry, 'position')
  const normal = floatArray(geometry, 'normal')
  const uv = floatArray(geometry, 'uv')
  const indexAttribute = geometry.getIndex()
  const index = indexAttribute ? new Uint32Array(indexAttribute.array).slice() : null

  const transfer: ArrayBuffer[] = [
    position.buffer as ArrayBuffer,
    normal.buffer as ArrayBuffer,
    uv.buffer as ArrayBuffer,
  ]
  if (index) transfer.push(index.buffer as ArrayBuffer)

  return { data: { position, normal, uv, index }, transfer }
}

export function deserializeGeometry(data: SerializedGeometry): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.position, 3))
  if (data.normal.length > 0) geometry.setAttribute('normal', new BufferAttribute(data.normal, 3))
  if (data.uv.length > 0) geometry.setAttribute('uv', new BufferAttribute(data.uv, 2))
  if (data.index) geometry.setIndex(new BufferAttribute(data.index, 1))
  return geometry
}
