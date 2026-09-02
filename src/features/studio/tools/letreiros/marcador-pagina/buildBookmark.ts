import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import type { BookmarkParams, FontStyle } from './schema'

export interface BuildBookmarkInput {
  font?: Font
  fonts?: Partial<Record<FontStyle, Font>>
  params: BookmarkParams
  onError?: (message: string) => void
}

export interface BuildBookmarkResult {
  base: import('three').BufferGeometry
  text: import('three').BufferGeometry
  textItems: Array<{ id: string; geometry: import('three').BufferGeometry }>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildBookmark(_input: BuildBookmarkInput): BuildBookmarkResult {
  // Stub - will be implemented in Task 3
  throw new Error('Not implemented')
}