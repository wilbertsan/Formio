import type { BuildCardResult } from './buildCard'
import {
  deserializeGeometry,
  serializeGeometry,
  type SerializedGeometry,
} from '../../confeitaria/shared/workerGeometry'

export interface SerializedCardResult {
  base: SerializedGeometry
  content: SerializedGeometry | null
  contentItems: Array<{ id: string; halfWidth: number; halfHeight: number }>
}

export function serializeCardResult(result: BuildCardResult): {
  data: SerializedCardResult
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

export function deserializeCardResult(data: SerializedCardResult): BuildCardResult {
  return {
    base: deserializeGeometry(data.base),
    content: data.content ? deserializeGeometry(data.content) : null,
    contentItems: data.contentItems.map((item) => ({ ...item, geometry: null })),
  }
}
