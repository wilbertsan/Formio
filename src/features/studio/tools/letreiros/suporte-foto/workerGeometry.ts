import type { BuildPhotoStandResult } from './buildPhotoStand'
import {
  deserializeGeometry,
  serializeGeometry,
  type SerializedGeometry,
} from '../../confeitaria/shared/workerGeometry'

export interface SerializedPhotoStandResult {
  base: SerializedGeometry
  content: SerializedGeometry | null
  contentItems: Array<{ id: string; halfWidth: number; halfHeight: number }>
}

export function serializePhotoStandResult(result: BuildPhotoStandResult): {
  data: SerializedPhotoStandResult
  transfer: ArrayBuffer[]
} {
  const base = serializeGeometry(result.base)
  const content = result.content ? serializeGeometry(result.content) : null
  return {
    data: {
      base: base.data,
      content: content?.data ?? null,
      contentItems: result.contentItems.map(({ id, halfWidth, halfHeight }) => ({
        id,
        halfWidth,
        halfHeight,
      })),
    },
    transfer: [...base.transfer, ...(content?.transfer ?? [])],
  }
}

export function deserializePhotoStandResult(data: SerializedPhotoStandResult): BuildPhotoStandResult {
  return {
    base: deserializeGeometry(data.base),
    content: data.content ? deserializeGeometry(data.content) : null,
    contentItems: data.contentItems.map((item) => ({ ...item })),
  }
}
