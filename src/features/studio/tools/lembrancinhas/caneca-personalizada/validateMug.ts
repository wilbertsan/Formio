import {
  HANDLE_FIT_INTERFERENCE,
  MAX_TEXT_ARC,
  MINIMUM_BOTTOM_MM,
  MINIMUM_WALL_MM,
  getCapacityMl,
  type MugGeometryParams,
} from './schema'
import { getBodyOuterRadius, getEffectiveRimChamfer, getHandleMetrics } from './shapes'

/** Margem entre o texto e a borda ou o fundo da caneca. */
export const TEXT_MARGIN_MM = 2
/** Margem entre o vão vertical da alça e a borda ou o fundo. */
const HANDLE_MARGIN_MM = 2
/** Abertura horizontal mínima confortável para a mão. */
const MIN_HAND_OPENING_MM = 16
/** Abertura vertical mínima confortável para a mão. */
export const MIN_HANDLE_GAP_MM = 26
/** Faixa útil de capacidade exibida. */
const MIN_CAPACITY_ML = 150
const MAX_CAPACITY_ML = 500
/**
 * Largura média por caractere da Helvetiker em caixa mista (medida: 0,675 a
 * 0,694). É uma estimativa conservadora; o build usa a fonte real e faz
 * auto-fit em `MAX_TEXT_ARC`.
 */
export const TEXT_WIDTH_FACTOR = 0.68
/**
 * Altura real dos glifos em relação ao tamanho nominal (medida: 1,01 a 1,07),
 * para a faixa do texto não subestimar a borda.
 */
export const GLYPH_HEIGHT_FACTOR = 1.1

export type IssueSeverity = 'error' | 'warning'

export type MugIssueCode =
  | 'mug-taper'
  | 'mug-wall'
  | 'mug-bottom'
  | 'mug-text-fit'
  | 'mug-text-band'
  | 'mug-handle-gap'
  | 'mug-handle-reach'
  | 'mug-handle-fit'
  | 'mug-handle-band'
  | 'mug-capacity'

export interface ValidationIssue {
  code: MugIssueCode
  severity: IssueSeverity
  message: string
}

/** Mesma estimativa usada no painel; o build real usa a fonte e faz auto-fit. */
export function estimateTextWidth(text: string, size: number): number {
  return text.trim().length * size * TEXT_WIDTH_FACTOR
}

export function validateMug(params: MugGeometryParams): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const text = params.text.trim()
  const chamfer = getEffectiveRimChamfer(params)
  const textRadius = getBodyOuterRadius(params, params.textCenterY)

  if (params.diameterTop < params.diameterBottom) {
    issues.push({
      code: 'mug-taper',
      severity: 'error',
      message: 'O diâmetro do topo precisa ser maior ou igual ao da base.',
    })
  }

  if (params.wallThickness < MINIMUM_WALL_MM) {
    issues.push({
      code: 'mug-wall',
      severity: 'error',
      message: `A parede precisa ter pelo menos ${MINIMUM_WALL_MM} mm.`,
    })
  }

  if (params.bottomThickness < MINIMUM_BOTTOM_MM) {
    issues.push({
      code: 'mug-bottom',
      severity: 'error',
      message: `O fundo precisa ter pelo menos ${MINIMUM_BOTTOM_MM} mm.`,
    })
  }

  if (text.length > 0) {
    const arc = estimateTextWidth(text, params.textSize) / textRadius
    if (arc > MAX_TEXT_ARC) {
      issues.push({
        code: 'mug-text-fit',
        severity: 'warning',
        message: 'O texto pode ser reduzido para caber no arco da caneca.',
      })
    }

    const fitScale = arc > 0 ? Math.min(1, MAX_TEXT_ARC / arc) : 1
    const halfHeight = ((params.textSize * GLYPH_HEIGHT_FACTOR) / 2) * fitScale
    const minY = params.bottomThickness + TEXT_MARGIN_MM
    const maxY = params.height - chamfer - TEXT_MARGIN_MM
    if (params.textCenterY - halfHeight < minY || params.textCenterY + halfHeight > maxY) {
      issues.push({
        code: 'mug-text-band',
        severity: 'error',
        message: 'O texto cruza a borda ou o fundo da caneca. Ajuste a altura ou o tamanho.',
      })
    }
  }

  if (params.handleEnabled) {
    const metrics = getHandleMetrics(params)
    if (params.handleGap < MIN_HANDLE_GAP_MM) {
      issues.push({
        code: 'mug-handle-gap',
        severity: 'warning',
        message: 'A abertura vertical da mão está pequena; o conforto fica comprometido.',
      })
    }
    if (metrics.handOpeningMinWidth < MIN_HAND_OPENING_MM) {
      issues.push({
        code: 'mug-handle-reach',
        severity: 'warning',
        message: 'O alcance da alça não deixa abertura suficiente para a mão.',
      })
    }
    if (params.handleClearance > HANDLE_FIT_INTERFERENCE) {
      issues.push({
        code: 'mug-handle-fit',
        severity: 'warning',
        message: 'A folga no meio da abraçadeira está alta; a alça fica apoiada no topo.',
      })
    }
    const span = params.handleGap / 2 + params.handleBand
    if (
      params.handleHeight - span < HANDLE_MARGIN_MM ||
      params.handleHeight + span > params.height - chamfer - HANDLE_MARGIN_MM
    ) {
      issues.push({
        code: 'mug-handle-band',
        severity: 'error',
        message: 'A alça não cabe na altura do corpo. Ajuste a altura, a abertura ou a banda.',
      })
    }
  }

  const capacity = getCapacityMl(params)
  if (capacity < MIN_CAPACITY_ML || capacity > MAX_CAPACITY_ML) {
    issues.push({
      code: 'mug-capacity',
      severity: 'warning',
      message: `A capacidade aproximada é ${capacity.toFixed(0)} ml (fora da faixa de ${MIN_CAPACITY_ML}–${MAX_CAPACITY_ML} ml).`,
    })
  }

  return issues
}
