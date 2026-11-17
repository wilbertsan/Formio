import { BufferAttribute, BufferGeometry } from 'three'
import type { BuildMugResult } from './buildMug'

export interface SerializedGeometry {
  position: Float32Array
  normal: Float32Array
  index: Uint32Array | null
}

export interface SerializedBuildResult {
  body: SerializedGeometry
  handle: SerializedGeometry | null
}

/** Códigos de falha de runtime do worker, traduzidos pelo hook. */
export type MugErrorCode = 'mug-invalid' | 'mug-font' | 'mug-csg' | 'mug-build'

/** Contrato de resposta do worker, usado pelo worker e pelo client. */
export interface MugWorkerResponse {
  id: number
  data?: SerializedBuildResult
  error?: MugErrorCode
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
  // O construtor de Uint32Array já copia os valores, mesmo de um Uint16Array.
  const index = indexAttribute ? new Uint32Array(indexAttribute.array) : null

  const transfer: ArrayBuffer[] = [
    position.buffer as ArrayBuffer,
    normal.buffer as ArrayBuffer,
  ]
  if (index !== null) transfer.push(index.buffer as ArrayBuffer)

  return { data: { position, normal, index }, transfer }
}

export function deserializeGeometry(data: SerializedGeometry): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.position, 3))
  if (data.index !== null) {
    geometry.setIndex(new BufferAttribute(data.index, 1))
  }
  if (data.normal.length > 0) {
    geometry.setAttribute('normal', new BufferAttribute(data.normal, 3))
  } else {
    geometry.computeVertexNormals()
  }
  return geometry
}

export function serializeBuildResult(result: BuildMugResult): {
  data: SerializedBuildResult
  transfer: ArrayBuffer[]
} {
  const body = serializeGeometry(result.body)
  const handle = result.handle ? serializeGeometry(result.handle) : null

  return {
    data: {
      body: body.data,
      handle: handle?.data ?? null,
    },
    transfer: [...body.transfer, ...(handle?.transfer ?? [])],
  }
}

export function deserializeBuildResult(
  data: SerializedBuildResult,
): BuildMugResult {
  return {
    body: deserializeGeometry(data.body),
    handle: data.handle ? deserializeGeometry(data.handle) : null,
  }
}
