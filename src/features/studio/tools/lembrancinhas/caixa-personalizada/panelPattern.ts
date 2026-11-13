import { MAX_PANEL_OPENINGS, type BoxGeometryParams } from './schema'

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
  latticeRows: number
  latticeCols: number
  capped: boolean
  innerWidth: number
  innerHeight: number
  innerRadius: number
  effectiveSpacingX: number
  effectiveSpacingY: number
  effectiveSize: number
  effectiveRib: number
}

export function isInsideRoundedRect(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  radius: number,
): boolean {
  const absX = Math.abs(x)
  const absY = Math.abs(y)
  if (absX > halfWidth + 1e-6 || absY > halfHeight + 1e-6) return false

  const r = Math.max(0, Math.min(radius, halfWidth, halfHeight))
  if (r <= 1e-6) return true

  const innerHalfWidth = halfWidth - r
  const innerHalfHeight = halfHeight - r
  if (absX <= innerHalfWidth + 1e-6 || absY <= innerHalfHeight + 1e-6) return true

  const dx = absX - innerHalfWidth
  const dy = absY - innerHalfHeight
  return dx * dx + dy * dy <= r * r + 1e-6
}

function holeFits(
  x: number,
  y: number,
  halfExtent: number,
  halfWidth: number,
  halfHeight: number,
  radius: number,
): boolean {
  return (
    isInsideRoundedRect(x - halfExtent, y - halfExtent, halfWidth, halfHeight, radius) &&
    isInsideRoundedRect(x + halfExtent, y - halfExtent, halfWidth, halfHeight, radius) &&
    isInsideRoundedRect(x - halfExtent, y + halfExtent, halfWidth, halfHeight, radius) &&
    isInsideRoundedRect(x + halfExtent, y + halfExtent, halfWidth, halfHeight, radius)
  )
}

export function computePanelPattern(params: BoxGeometryParams): PanelPatternResult {
  const innerWidth = Math.max(0, params.frontPanelWidth - 2 * params.borderWidth)
  const innerHeight = Math.max(0, params.frontPanelHeight - 2 * params.borderWidth)

  if (innerWidth <= 0 || innerHeight <= 0) {
    return {
      holes: [],
      rows: 0,
      cols: 0,
      latticeRows: 0,
      latticeCols: 0,
      capped: false,
      innerWidth,
      innerHeight,
      innerRadius: 0,
      effectiveSpacingX: params.holeSpacingX,
      effectiveSpacingY: params.holeSpacingY,
      effectiveSize: 0,
      effectiveRib: 0,
    }
  }

  const innerRadius = Math.max(
    0,
    Math.min(
      params.frontPanelCornerRadius - params.borderWidth,
      innerWidth / 2,
      innerHeight / 2,
    ),
  )

  let spacingX = params.holeSpacingX
  let spacingY = params.holeSpacingY
  let latticeCols = Math.max(1, Math.floor(innerWidth / spacingX) + 1)
  let latticeRows = Math.max(1, Math.floor(innerHeight / spacingY) + 1)
  let capped = false

  if (latticeCols * latticeRows > MAX_PANEL_OPENINGS) {
    capped = true
    let guard = 0
    while (latticeCols * latticeRows > MAX_PANEL_OPENINGS && guard < 24) {
      spacingX *= 1.15
      spacingY *= 1.15
      latticeCols = Math.max(1, Math.floor(innerWidth / spacingX) + 1)
      latticeRows = Math.max(1, Math.floor(innerHeight / spacingY) + 1)
      guard++
    }
  }

  const angle =
    params.pattern === 'perforated'
      ? 0
      : (params.gridAngle * Math.PI) / 180 + (params.pattern === 'mesh' ? Math.PI / 4 : 0)
  const projection =
    params.pattern === 'perforated' ? 1 : Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle))
  const maxSize = Math.max(0, Math.min(spacingX, spacingY) - params.gridThickness) / projection
  const size = Math.min(params.holeDiameter, maxSize)
  const effectiveRib = size > 0 ? Math.min(spacingX, spacingY) - size * projection : 0

  const holes: PanelHole[] = []
  const usedRows = new Set<number>()
  const usedCols = new Set<number>()

  if (size > 0) {
    const startX = -((latticeCols - 1) * spacingX) / 2
    const startY = -((latticeRows - 1) * spacingY) / 2
    const halfExtent = (size * projection) / 2
    const kind: PanelHole['kind'] =
      params.pattern === 'perforated'
        ? 'circle'
        : params.pattern === 'grid'
          ? 'square'
          : 'diamond'

    for (let row = 0; row < latticeRows; row++) {
      for (let col = 0; col < latticeCols; col++) {
        const x = startX + col * spacingX
        const y = startY + row * spacingY
        if (!holeFits(x, y, halfExtent, innerWidth / 2, innerHeight / 2, innerRadius)) continue
        holes.push({ kind, x, y, size, angle })
        usedRows.add(row)
        usedCols.add(col)
      }
    }
  }

  return {
    holes,
    rows: usedRows.size,
    cols: usedCols.size,
    latticeRows,
    latticeCols,
    capped,
    innerWidth,
    innerHeight,
    innerRadius,
    effectiveSpacingX: spacingX,
    effectiveSpacingY: spacingY,
    effectiveSize: size,
    effectiveRib,
  }
}
