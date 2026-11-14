import { computeScreenPattern } from './screenPattern'
import {
  MAX_SCREEN_OPENINGS,
  MINIMUM_FEATURE_MM,
  type ThermoformerGeometryParams,
} from './schema'

export type IssueSeverity = 'error' | 'warning'

export type ScreenIssueCode =
  | 'screen-frame'
  | 'screen-empty'
  | 'screen-density'
  | 'screen-opening'
  | 'screen-line'

export interface ValidationIssue {
  code: ScreenIssueCode
  severity: IssueSeverity
  message: string
}

export function validateScreen(
  params: ThermoformerGeometryParams,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const outerRadius = params.diameter / 2
  const pattern = computeScreenPattern(params)

  if (params.frameWidth >= outerRadius) {
    issues.push({
      code: 'screen-frame',
      severity: 'error',
      message: 'O aro consome todo o diâmetro da tela. Reduza o aro ou aumente o diâmetro.',
    })
    return issues
  }

  if (pattern.cells.length === 0) {
    issues.push({
      code: 'screen-empty',
      severity: 'warning',
      message: 'Nenhum favo cabe na área interna com a abertura atual. Reduza a abertura ou o aro.',
    })
  } else if (params.opening >= pattern.innerRadius) {
    issues.push({
      code: 'screen-opening',
      severity: 'warning',
      message: 'A abertura do favo ocupa o raio interno da tela e deixa um único favo. Reduza a abertura ou o aro.',
    })
  }

  if (pattern.capped) {
    issues.push({
      code: 'screen-density',
      severity: 'warning',
      message: `A malha foi limitada a ${MAX_SCREEN_OPENINGS} favos; a abertura efetiva é ${pattern.effectiveOpening.toFixed(1)} mm.`,
    })
  }

  // Guarda defensiva para chamadores diretos fora dos intervalos do Zod; a UI não alcança este caso.
  if (pattern.effectiveLine < MINIMUM_FEATURE_MM - 1e-9) {
    issues.push({
      code: 'screen-line',
      severity: 'warning',
      message: `A linha efetiva fica abaixo de ${MINIMUM_FEATURE_MM} mm.`,
    })
  }

  return issues
}
