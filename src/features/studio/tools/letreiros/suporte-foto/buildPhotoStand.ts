import { type BufferGeometry, Box3, BoxGeometry, ExtrudeGeometry, Shape } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import type { PhotoStandParams } from './schema'
import { PHOTO_SIZES, SLOT_ANGLE } from './schema'

export interface BuildPhotoStandInput {
  params: PhotoStandParams
  font: Font
}

export interface BuildPhotoStandResult {
  leftText: BufferGeometry
  rightText: BufferGeometry
  base: BufferGeometry
  boundingBox: { width: number; height: number; depth: number }
}

const FONT_SIZE_RATIO = 0.6
const EMPTY_GEOMETRY_SIZE = 0.01

function createTextGeometry(text: string, font: Font, size: number, depth: number): BufferGeometry {
  const geometry = new TextGeometry(text, {
    font,
    size,
    depth,
    curveSegments: 8,
    bevelEnabled: false,
  })
  geometry.center()
  return geometry
}

function measureTextWidth(text: string, font: Font, fontSize: number): number {
  const geometry = new TextGeometry(text, {
    font,
    size: fontSize,
    depth: 0,
    curveSegments: 8,
    bevelEnabled: false,
  })
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  if (!bb) throw new Error('Failed to compute text bounding box')
  const width = bb.max.x - bb.min.x
  geometry.dispose()
  return width
}

function findSplitPoint(text: string, font: Font, fontSize: number): number {
  if (text.length <= 1) return 0

  let bestIndex = Math.floor(text.length / 2)
  let bestDiff = Infinity

  for (let i = 1; i < text.length; i++) {
    if (text[i - 1] !== ' ' && text[i] !== ' ') continue

    const leftText = text.slice(0, i).trim()
    const rightText = text.slice(i).trim()
    if (!leftText || !rightText) continue

    const leftWidth = measureTextWidth(leftText, font, fontSize)
    const rightWidth = measureTextWidth(rightText, font, fontSize)
    const diff = Math.abs(leftWidth - rightWidth)

    if (diff < bestDiff) {
      bestDiff = diff
      bestIndex = i
    }
  }

  return bestIndex
}

function splitText(text: string, font: Font, fontSize: number): { left: string; right: string } {
  if (text.length <= 1) {
    return { left: text, right: '' }
  }

  const splitIndex = findSplitPoint(text, font, fontSize)
  return {
    left: text.slice(0, splitIndex).trim(),
    right: text.slice(splitIndex).trim(),
  }
}

function buildBaseShape(width: number, height: number): Shape {
  const shape = new Shape()
  const hw = width / 2
  const hh = height / 2
  const r = Math.min(2, hw, hh)

  shape.moveTo(-hw + r, -hh)
  shape.lineTo(hw - r, -hh)
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r)
  shape.lineTo(hw, hh - r)
  shape.quadraticCurveTo(hw, hh, hw - r, hh)
  shape.lineTo(-hw + r, hh)
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r)
  shape.lineTo(-hw, -hh + r)
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh)

  return shape
}

export function buildPhotoStand({ params, font }: BuildPhotoStandInput): BuildPhotoStandResult {
  const fontSize = params.baseHeight * FONT_SIZE_RATIO
  const photoWidth = PHOTO_SIZES[params.photoSize as keyof typeof PHOTO_SIZES].width

  const { left: leftTextStr, right: rightTextStr } = splitText(params.text, font, fontSize)

  const leftWidth = leftTextStr ? measureTextWidth(leftTextStr, font, fontSize) : 0
  const rightWidth = rightTextStr ? measureTextWidth(rightTextStr, font, fontSize) : 0

  let totalWidth = leftWidth + photoWidth + rightWidth
  let padding = 0
  if (totalWidth < params.baseMinWidth) {
    padding = (params.baseMinWidth - totalWidth) / 2
    totalWidth = params.baseMinWidth
  }

  const leftX = -(photoWidth / 2 + leftWidth / 2) - padding
  const rightX = (photoWidth / 2 + rightWidth / 2) + padding

  const leftGeometry = leftTextStr
    ? createTextGeometry(leftTextStr, font, fontSize, params.baseThickness)
    : new BoxGeometry(EMPTY_GEOMETRY_SIZE, EMPTY_GEOMETRY_SIZE, EMPTY_GEOMETRY_SIZE)

  const rightGeometry = rightTextStr
    ? createTextGeometry(rightTextStr, font, fontSize, params.baseThickness)
    : new BoxGeometry(EMPTY_GEOMETRY_SIZE, EMPTY_GEOMETRY_SIZE, EMPTY_GEOMETRY_SIZE)

  leftGeometry.translate(leftX, 0, 0)
  rightGeometry.translate(rightX, 0, 0)

  const angleRad = (SLOT_ANGLE * Math.PI) / 180
  leftGeometry.rotateX(-angleRad)
  rightGeometry.rotateX(-angleRad)

  const baseShape = buildBaseShape(totalWidth, params.baseDepth)
  const base = new ExtrudeGeometry(baseShape, {
    depth: params.baseThickness,
    bevelEnabled: false,
  })

  base.computeBoundingBox()
  const bb = base.boundingBox
  if (!bb) throw new Error('Failed to compute base bounding box')
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  base.translate(-cx, -cy, 0)

  // Compute overall bounding box from all geometries
  const box = new Box3()
  if (leftGeometry.boundingBox) box.union(leftGeometry.boundingBox)
  if (rightGeometry.boundingBox) box.union(rightGeometry.boundingBox)
  if (base.boundingBox) box.union(base.boundingBox)
  const size = { x: 0, y: 0, z: 0 }
  box.getSize(size as any)

  return {
    leftText: leftGeometry,
    rightText: rightGeometry,
    base,
    boundingBox: { width: size.x, height: size.y, depth: size.z },
  }
}
