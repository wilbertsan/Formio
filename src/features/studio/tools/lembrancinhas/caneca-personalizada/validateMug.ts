import {
  HANDLE_WRAP,
  MAX_TEXT_ARC,
  MINIMUM_BOTTOM_MM,
  MINIMUM_WALL_MM,
  getCapacityMl,
  type MugGeometryParams,
} from './schema'
import { getBodyOuterRadius, getEffectiveRimChamfer, getHandleMetrics } from './shapes'

export type IssueSeverity = 'error' | 'warning'

export type MugIssueCode =
  | 'mug-taper'
  | 'mug-wall'
  | 'mug-bottom'
  | 'mug-text-fit'
  | 'mug-text-band'
  | 'mug-text-rail'
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
  return text.trim().length * size * 0.62
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
        message: 'O texto será reduzido para caber no arco da caneca.',
      })
    }

    const halfHeight = params.textSize / 2
    const minY = params.bottomThickness + 2
    const maxY = params.height - chamfer - 2
    if (params.textCenterY - halfHeight < minY || params.textCenterY + halfHeight > maxY) {
      issues.push({
        code: 'mug-text-band',
        severity: 'error',
        message: 'O texto cruza a borda ou o fundo da caneca. Ajuste a altura ou o tamanho.',
      })
    }

    const halfWrap = HANDLE_WRAP / 2
    const gapStart = halfWrap
    const gapEnd = Math.PI * 2 - halfWrap
    const margin = (8 * Math.PI) / 180
    const textStart = Math.PI - arc / 2
    const textEnd = Math.PI + arc / 2
    if (params.handleEnabled && (textStart < gapStart + margin || textEnd > gapEnd - margin)) {
      issues.push({
        code: 'mug-text-rail',
        severity: 'warning',
        message: 'O texto se aproxima da abraçadeira da alça. Reduza o tamanho ou o número de caracteres.',
      })
    }
  }

  if (params.handleEnabled) {
    const metrics = getHandleMetrics(params)
    if (params.handleGap < 18) {
      issues.push({
        code: 'mug-handle-gap',
        severity: 'warning',
        message: 'A abertura vertical da mão está pequena; o conforto fica comprometido.',
      })
    }
    if (metrics.handOpeningMinWidth < 16) {
      issues.push({
        code: 'mug-handle-reach',
        severity: 'warning',
        message: 'O alcance da alça não deixa abertura suficiente para a mão.',
      })
    }
    if (params.handleClearance > 0.4) {
      issues.push({
        code: 'mug-handle-fit',
        severity: 'warning',
        message: 'A folga no meio da abraçadeira está alta; a alça fica apoiada no topo.',
      })
    }
    const span = params.handleGap / 2 + params.handleBand
    if (
      params.handleHeight - span < 2 ||
      params.handleHeight + span > params.height - chamfer - 2
    ) {
      issues.push({
        code: 'mug-handle-band',
        severity: 'error',
        message: 'A alça não cabe na altura do corpo. Ajuste a altura, a abertura ou a banda.',
      })
    }
  }

  const capacity = getCapacityMl(params)
  if (capacity < 150 || capacity > 500) {
    issues.push({
      code: 'mug-capacity',
      severity: 'warning',
      message: `A capacidade aproximada é ${capacity.toFixed(0)} ml (fora da faixa de 150–500 ml).`,
    })
  }

  return issues
}
