import { MAX_PANEL_OPENINGS, type ThermoformerGeometryParams } from './schema'

export interface PanelHole {
  kind: 'circle' | 'square' | 'diamond'
  x: number
  y: number
  size: number
  angle: number
}

export interface PanelPatternResult {
  holes: PanelHole[]
  rows: number
  cols: number
  capped: boolean
  innerWidth: number
  innerHeight: number
  effectiveSpacingX: number
  effectiveSpacingY: number
  effectiveSize: number
  effectiveRib: number
}

export function computePanelPattern(params: ThermoformerGeometryParams): PanelPatternResult {
  const innerWidth = Math.max(0, params.frontPanelWidth - 2 * params.borderWidth)
  const innerHeight = Math.max(0, params.frontPanelHeight - 2 * params.borderWidth)

  if (innerWidth <= 0 || innerHeight <= 0) {
    return {
      holes: [],
      rows: 0,
      cols: 0,
      capped: false,
      innerWidth,
      innerHeight,
      effectiveSpacingX: params.holeSpacingX,
      effectiveSpacingY: params.holeSpacingY,
      effectiveSize: 0,
      effectiveRib: 0,
    }
  }

  let spacingX = params.holeSpacingX
  let spacingY = params.holeSpacingY
  let cols = Math.max(1, Math.floor(innerWidth / spacingX) + 1)
  let rows = Math.max(1, Math.floor(innerHeight / spacingY) + 1)
  let capped = false

  if (cols * rows > MAX_PANEL_OPENINGS) {
    capped = true
    let guard = 0
    while (cols * rows > MAX_PANEL_OPENINGS && guard < 24) {
      spacingX *= 1.15
      spacingY *= 1.15
      cols = Math.max(1, Math.floor(innerWidth / spacingX) + 1)
      rows = Math.max(1, Math.floor(innerHeight / spacingY) + 1)
      guard++
    }
  }

  const angle =
    (params.gridAngle * Math.PI) / 180 + (params.pattern === 'mesh' ? Math.PI / 4 : 0)
  const projection =
    params.pattern === 'perforated' ? 1 : Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle))
  const maxSize = Math.max(0, Math.min(spacingX, spacingY) - params.gridThickness) / projection
  const size = Math.min(params.holeDiameter, maxSize)
  const effectiveRib = Math.min(spacingX, spacingY) - size * projection

  const holes: PanelHole[] = []
  if (size > 0) {
    const startX = -((cols - 1) * spacingX) / 2
    const startY = -((rows - 1) * spacingY) / 2
    const halfExtent = (size * projection) / 2
    const kind: PanelHole['kind'] =
      params.pattern === 'perforated' ? 'circle' : params.pattern === 'grid' ? 'square' : 'diamond'

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * spacingX
        const y = startY + row * spacingY
        if (Math.abs(x) + halfExtent > innerWidth / 2 + 1e-6) continue
        if (Math.abs(y) + halfExtent > innerHeight / 2 + 1e-6) continue
        holes.push({ kind, x, y, size, angle })
      }
    }
  }

  return {
    holes,
    rows,
    cols,
    capped,
    innerWidth,
    innerHeight,
    effectiveSpacingX: spacingX,
    effectiveSpacingY: spacingY,
    effectiveSize: size,
    effectiveRib,
  }
}
