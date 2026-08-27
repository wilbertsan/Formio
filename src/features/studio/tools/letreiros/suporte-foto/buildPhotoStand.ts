import { type BufferGeometry, BoxGeometry, ExtrudeGeometry, Shape } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import type { PhotoStandParams } from './schema'
import { PHOTO_SIZES, SLOT_ANGLE, SLOT_WIDTH, SLOT_DEPTH } from './schema'

export interface BuildPhotoStandInput {
  params: PhotoStandParams
  font: Font
}

export interface BuildPhotoStandResult {
  leftText: BufferGeometry
  rightText: BufferGeometry
  base: BufferGeometry
}

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
  const bb = geometry.boundingBox!
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
  const fontSize = params.baseHeight * 0.6
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
    : new BoxGeometry(0.01, 0.01, 0.01)

  const rightGeometry = rightTextStr
    ? createTextGeometry(rightTextStr, font, fontSize, params.baseThickness)
    : new BoxGeometry(0.01, 0.01, 0.01)

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
  const bb = base.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  base.translate(-cx, -cy, 0)

  return {
    leftText: leftGeometry,
    rightText: rightGeometry,
    base,
  }
}
