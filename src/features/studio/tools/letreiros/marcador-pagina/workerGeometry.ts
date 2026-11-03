import type { BuildBookmarkResult } from './buildBookmark'
import {
  deserializeGeometry,
  serializeGeometry,
  type SerializedGeometry,
} from '../../confeitaria/shared/workerGeometry'

export interface SerializedBookmarkResult {
  base: SerializedGeometry
  text: SerializedGeometry
}

export function serializeBookmarkResult(result: BuildBookmarkResult): {
  data: SerializedBookmarkResult
  transfer: ArrayBuffer[]
} {
  const base = serializeGeometry(result.base)
  const text = serializeGeometry(result.text)
  return {
    data: {
      base: base.data,
      text: text.data,
    },
    transfer: [...base.transfer, ...text.transfer],
  }
}

export function deserializeBookmarkResult(data: SerializedBookmarkResult): BuildBookmarkResult {
  return {
    base: deserializeGeometry(data.base),
    text: deserializeGeometry(data.text),
  }
}
