import ClipperLib from 'js-clipper'
import {
  pathsBoundingBox,
  type ClipperPoint,
} from '../../confeitaria/shared/textOutline'
import {
  MINIMUM_DRAFT_ANGLE_DEG,
  MINIMUM_PYRAMID_TIP_MM,
  MINIMUM_TRAY_BOTTOM_SCALE,
  PLUG_GRIP_MAX_MM,
  PLUG_GRIP_MIN_MATERIAL_MM,
  type ThermoformerGeometryParams,
} from './schema'
import {
  offsetOutlinePaths,
  pointInPaths,
  type OutlineJoin,
  type ShapeOutline,
} from './outline'

export interface TrayDimensions {
  outerBounds: ReturnType<typeof pathsBoundingBox>
  screenBounds: ReturnType<typeof pathsBoundingBox>
  height: number
  seatY: number
  contactY: number
  bodyTop: number
  effectiveDepth: number
  requestedDepth: number
  bottomScale: number
  bottomMin: number
  effectiveStep: number
  stepClamped: boolean
  depthLimited: boolean
  draftLow: boolean
  tipSmall: boolean
  cavityWall: number
  guideWidth: number
  guideHeight: number
  gripRadius: number
  gripDepth: number
  gripX: number
  gripY: number
  gripEnabled: boolean
  plugHeight: number
  plugTotalHeight: number
}

/**
 * Centro da pega que mantém o disco do raio inteiro dentro do material. O
 * centro do envelope não serve para contornos côncavos (C, L), onde ele cai
 * no vão. O maior pedaço do encolhimento garante espaço para o cone; quando o
 * encolhimento colapsa, a pega é desabilitada.
 */
function getGripCenter(
  paths: ClipperPoint[][],
  gripRadius: number,
  join: OutlineJoin,
): { x: number; y: number } | null {
  const inset = offsetOutlinePaths(paths, -gripRadius, join)
  if (inset.length === 0) return null
  let largest = inset[0]
  for (const path of inset) {
    if (
      Math.abs(ClipperLib.Clipper.Area(path)) >
      Math.abs(ClipperLib.Clipper.Area(largest))
    ) {
      largest = path
    }
  }
  const bounds = pathsBoundingBox([largest])
  const candidates: Array<[number, number]> = [[
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
  ]]
  for (let ix = 1; ix < 8; ix++) {
    for (let iy = 1; iy < 8; iy++) {
      candidates.push([
        bounds.minX + (bounds.width * ix) / 8,
        bounds.minY + (bounds.height * iy) / 8,
      ])
    }
  }
  for (const [x, y] of candidates) {
    if (pointInPaths(x, y, [largest])) return { x, y }
  }
  return null
}

export function getTrayDimensions(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): TrayDimensions {
  if (outline.kind !== 'polygon') {
    throw new Error('getTrayDimensions só aceita contornos poligonais')
  }

  const screenBounds = outline.bounds
  const cavityBounds = pathsBoundingBox(outline.cavityOpening ?? [])
  const minScreen = Math.max(
    1e-6,
    Math.min(screenBounds.width, screenBounds.height),
  )
  const minOpening = Math.max(
    1e-6,
    Math.min(cavityBounds.width, cavityBounds.height),
  )
  // O degrau efetivo já considera a moldura; a bandeja não o recalcula.
  const effectiveStep = outline.effectiveStep
  const stepClamped = effectiveStep > params.stepWidth + 1e-9
  const requestedDepth = Math.max(0.1, params.bowlDepth)
  let effectiveDepth = requestedDepth
  let bottomScale = 1
  let depthLimited = false

  if (params.shape === 'pyramid') {
    bottomScale = params.pyramidTip
  } else {
    const tan = Math.tan((params.draftAngle * Math.PI) / 180)
    if (tan <= 1e-9) {
      bottomScale = 1
    } else {
      bottomScale = 1 - (2 * effectiveDepth * tan) / minOpening
      if (bottomScale < MINIMUM_TRAY_BOTTOM_SCALE) {
        effectiveDepth =
          ((1 - MINIMUM_TRAY_BOTTOM_SCALE) * minOpening) / (2 * tan)
        bottomScale = MINIMUM_TRAY_BOTTOM_SCALE
        depthLimited = true
      }
    }
  }

  const seatY = effectiveDepth + params.bottomThickness
  const height = params.thickness + effectiveDepth + params.bottomThickness
  const contactY = seatY + params.thickness
  const bodyTop = contactY + params.plugHeight
  const bottomMin = bottomScale * minOpening
  const draftLow =
    params.shape !== 'pyramid' &&
    params.draftAngle < MINIMUM_DRAFT_ANGLE_DEG
  const tipSmall =
    params.shape === 'pyramid' && bottomMin < MINIMUM_PYRAMID_TIP_MM
  const gripRadius = Math.min(
    params.plugHeight * 0.9,
    minScreen * 0.35,
    PLUG_GRIP_MAX_MM,
  )
  const gripCenter = getGripCenter(
    outline.paths ?? [],
    gripRadius,
    outline.join,
  )
  const gripEnabled = gripCenter !== null
  const gripDepth = gripEnabled
    ? Math.min(
        gripRadius * 1.2,
        effectiveDepth + params.plugHeight - PLUG_GRIP_MIN_MATERIAL_MM,
      )
    : 0

  return {
    outerBounds: pathsBoundingBox(outline.supportOuter ?? []),
    screenBounds,
    height,
    seatY,
    contactY,
    bodyTop,
    effectiveDepth,
    requestedDepth,
    bottomScale,
    bottomMin,
    effectiveStep,
    stepClamped,
    depthLimited,
    draftLow,
    tipSmall,
    cavityWall: params.wallThickness + effectiveStep,
    guideWidth: screenBounds.width,
    guideHeight: screenBounds.height,
    gripRadius,
    gripDepth,
    gripX: gripCenter?.x ?? 0,
    gripY: gripCenter?.y ?? 0,
    gripEnabled,
    plugHeight: params.plugHeight,
    plugTotalHeight: effectiveDepth + params.plugHeight,
  }
}
