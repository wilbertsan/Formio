import { BufferAttribute, BufferGeometry } from 'three'

export interface SerializedGeometry {
  position: Float32Array
  normal: Float32Array
  index: Uint32Array | null
}

export function serializeGeometry(geometry: BufferGeometry): {
  data: SerializedGeometry
  transfer: ArrayBuffer[]
} {
  const positionAttribute = geometry.getAttribute('position')
  const normalAttribute = geometry.getAttribute('normal')
  const position = positionAttribute
    ? (positionAttribute.array as Float32Array).slice()
    : new Float32Array(0)
  const normal = normalAttribute
    ? (normalAttribute.array as Float32Array).slice()
    : new Float32Array(0)
  const indexAttribute = geometry.getIndex()
  const index = indexAttribute
    ? new Uint32Array(indexAttribute.array).slice()
    : null

  const transfer: ArrayBuffer[] = [
    position.buffer as ArrayBuffer,
    normal.buffer as ArrayBuffer,
  ]
  if (index) transfer.push(index.buffer as ArrayBuffer)

  return { data: { position, normal, index }, transfer }
}

export function deserializeGeometry(data: SerializedGeometry): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.position, 3))
  if (data.normal.length > 0) {
    geometry.setAttribute('normal', new BufferAttribute(data.normal, 3))
  }
  if (data.index) geometry.setIndex(new BufferAttribute(data.index, 1))
  return geometry
}
