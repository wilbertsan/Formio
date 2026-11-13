import { BufferAttribute, BufferGeometry } from 'three'
import type { BuildThermoformerResult } from './buildThermoformer'

export interface SerializedGeometry {
  position: Float32Array
  normal: Float32Array
  index: Uint32Array | null
}

export interface SerializedBuildResult {
  body: SerializedGeometry
  lid: SerializedGeometry | null
  frontPanel: SerializedGeometry
  handle: SerializedGeometry | null
  base: SerializedGeometry | null
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

function serializePart(geometry: BufferGeometry | null): {
  data: SerializedGeometry | null
  transfer: ArrayBuffer[]
} {
  if (!geometry) return { data: null, transfer: [] }
  return serializeGeometry(geometry)
}

export function serializeBuildResult(result: BuildThermoformerResult): {
  data: SerializedBuildResult
  transfer: ArrayBuffer[]
} {
  const body = serializePart(result.body)
  const lid = serializePart(result.lid)
  const frontPanel = serializePart(result.frontPanel)
  const handle = serializePart(result.handle)
  const base = serializePart(result.base)

  return {
    data: {
      body: body.data!,
      lid: lid.data,
      frontPanel: frontPanel.data!,
      handle: handle.data,
      base: base.data,
    },
    transfer: [
      ...body.transfer,
      ...lid.transfer,
      ...frontPanel.transfer,
      ...handle.transfer,
      ...base.transfer,
    ],
  }
}

export function deserializeBuildResult(
  data: SerializedBuildResult,
): BuildThermoformerResult {
  return {
    body: deserializeGeometry(data.body),
    lid: data.lid ? deserializeGeometry(data.lid) : null,
    frontPanel: deserializeGeometry(data.frontPanel),
    handle: data.handle ? deserializeGeometry(data.handle) : null,
    base: data.base ? deserializeGeometry(data.base) : null,
  }
}
