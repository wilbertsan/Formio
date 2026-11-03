import { ExtrudeGeometry, Shape, type BufferGeometry } from 'three'

export interface BookmarkBaseInput {
  length: number
  width: number
  thickness: number
  centerX?: number
}

export function createBookmarkShape({
  length,
  width,
  centerX = 0,
}: Pick<BookmarkBaseInput, 'length' | 'width' | 'centerX'>): Shape {
  const shape = new Shape()
  const halfWidth = width / 2
  const halfLength = length / 2
  const left = centerX - halfWidth
  const right = centerX + halfWidth

  shape.moveTo(left, -halfLength)
  shape.lineTo(right, -halfLength)
  shape.lineTo(right, halfLength)
  shape.lineTo(left, halfLength)
  shape.lineTo(left, -halfLength)

  return shape
}

export function buildBookmarkBase(input: BookmarkBaseInput): BufferGeometry {
  return new ExtrudeGeometry(createBookmarkShape(input), {
    depth: input.thickness,
    bevelEnabled: false,
  })
}
