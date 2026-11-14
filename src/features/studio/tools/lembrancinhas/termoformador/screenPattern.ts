import {
  MAX_SCREEN_OPENINGS,
  type ThermoformerGeometryParams,
} from './schema'

export interface ScreenCell {
  x: number
  y: number
  radius: number
}

export interface ScreenPatternResult {
  cells: ScreenCell[]
  capped: boolean
  innerRadius: number
  effectiveOpening: number
  effectiveLine: number
  cellRadius: number
  spacing: number
}

const EPS = 1e-6
const GROWTH_FACTOR = 1.15
const MAX_ATTEMPTS = 24

export function computeScreenPattern(
  params: ThermoformerGeometryParams,
): ScreenPatternResult {
  const outerRadius = params.diameter / 2
  const innerRadius = outerRadius - params.frameWidth
  const line = Math.max(0, params.lineWidth)

  if (innerRadius <= EPS) {
    return {
      cells: [],
      capped: false,
      innerRadius: Math.max(0, innerRadius),
      effectiveOpening: params.opening,
      effectiveLine: line,
      cellRadius: params.opening / Math.sqrt(3),
      spacing: params.opening + line,
    }
  }

  let effectiveOpening = params.opening
  let capped = false
  let cells: ScreenCell[] = []
  let cellRadius = 0
  let spacing = 0

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    cellRadius = effectiveOpening / Math.sqrt(3)
    spacing = effectiveOpening + line

    // Treliça flat-top: passo horizontal (√3/2)·spacing e vertical spacing,
    // com colunas ímpares deslocadas meia linha.
    const stepX = (Math.sqrt(3) / 2) * spacing
    const stepY = spacing
    const columnBound = Math.ceil(innerRadius / stepX) + 2
    const rowBound = Math.ceil(innerRadius / stepY) + 2

    const next: ScreenCell[] = []

    for (let column = -columnBound; column <= columnBound; column++) {
      const offset = Math.abs(column) % 2 === 1 ? stepY / 2 : 0
      for (let row = -rowBound; row <= rowBound; row++) {
        const x = column * stepX
        const y = row * stepY + offset
        if (Math.hypot(x, y) + cellRadius > innerRadius + EPS) continue
        next.push({ x, y, radius: cellRadius })
      }
    }

    cells = next

    if (cells.length <= MAX_SCREEN_OPENINGS) break

    capped = true
    // O limite é best-effort apenas se MAX_ATTEMPTS esgotar
    // (inalcançável com as faixas do schema).
    if (attempt < MAX_ATTEMPTS - 1) effectiveOpening *= GROWTH_FACTOR
  }

  return {
    cells,
    capped,
    innerRadius,
    effectiveOpening,
    effectiveLine: line,
    cellRadius,
    spacing,
  }
}
