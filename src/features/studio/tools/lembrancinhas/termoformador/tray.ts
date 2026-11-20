import { pathsBoundingBox } from '../../confeitaria/shared/textOutline'
import {
  MINIMUM_DRAFT_ANGLE_DEG,
  MINIMUM_PYRAMID_TIP_MM,
  MINIMUM_TRAY_BOTTOM_SCALE,
  PLUG_GRIP_MAX_MM,
  PLUG_GRIP_MIN_MATERIAL_MM,
  type ThermoformerGeometryParams,
} from './schema'
import type { ShapeOutline } from './outline'

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
  plugHeight: number
  plugTotalHeight: number
}

export function getTrayDimensions(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): TrayDimensions {
  const screenBounds = pathsBoundingBox(outline.paths ?? [])
  const openingBounds = pathsBoundingBox(outline.perforated ?? [])
  const minScreen = Math.max(
    1e-6,
    Math.min(screenBounds.width, screenBounds.height),
  )
  const minOpening = Math.max(
    1e-6,
    Math.min(openingBounds.width, openingBounds.height),
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
  const gripDepth = Math.min(
    gripRadius * 1.2,
    effectiveDepth + params.plugHeight - PLUG_GRIP_MIN_MATERIAL_MM,
  )

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
    plugHeight: params.plugHeight,
    plugTotalHeight: effectiveDepth + params.plugHeight,
  }
}
