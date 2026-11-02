import type { BuildContentItem, BuildKeychainResult } from './buildKeychain'
import type { BoundingBox2D, Circle2D } from './positioning'
import {
  deserializeGeometry,
  serializeGeometry,
  type SerializedGeometry,
} from '../../confeitaria/shared/workerGeometry'

export interface SerializedKeychainResult {
  base: SerializedGeometry
  content: SerializedGeometry | null
  contentItems: Array<Pick<BuildContentItem, 'id' | 'halfWidth' | 'halfHeight'>>
  pieceBB: BoundingBox2D
  hole: Circle2D
}

export function serializeKeychainResult(result: BuildKeychainResult): {
  data: SerializedKeychainResult
  transfer: ArrayBuffer[]
} {
  const base = serializeGeometry(result.base)
  const content = result.content ? serializeGeometry(result.content) : null
  return {
    data: {
      base: base.data,
      content: content?.data ?? null,
      contentItems: result.contentItems.map(({ id, halfWidth, halfHeight }) => ({ id, halfWidth, halfHeight })),
      pieceBB: result.pieceBB,
      hole: result.hole,
    },
    transfer: [...base.transfer, ...(content?.transfer ?? [])],
  }
}

export function deserializeKeychainResult(data: SerializedKeychainResult): BuildKeychainResult {
  return {
    base: deserializeGeometry(data.base),
    content: data.content ? deserializeGeometry(data.content) : null,
    contentItems: data.contentItems.map((item) => ({ ...item, geometry: null })),
    pieceBB: data.pieceBB,
    hole: data.hole,
  }
}
