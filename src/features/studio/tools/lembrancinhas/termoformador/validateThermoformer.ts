import { computeScreenPattern } from './screenPattern'
import { getSupportDimensions } from './buildSupport'
import { getPlugDimensions } from './buildPlug'
import {
  MAX_SCREEN_OPENINGS,
  MINIMUM_LINE_MM,
  MINIMUM_SUPPORT_MM,
  type ThermoformerGeometryParams,
} from './schema'

export type IssueSeverity = 'error' | 'warning'

export type ThermoformerIssueCode =
  | 'screen-frame'
  | 'screen-empty'
  | 'screen-density'
  | 'screen-opening'
  | 'screen-line'
  | 'support-step'
  | 'support-step-frame'
  | 'support-wall'
  | 'support-bottom'
  | 'support-clearance'
  | 'support-depth'
  | 'plug-guide'

export interface ValidationIssue {
  code: ThermoformerIssueCode
  severity: IssueSeverity
  message: string
}

export function validateThermoformer(
  params: ThermoformerGeometryParams,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const outerRadius = params.diameter / 2
  const pattern = computeScreenPattern(params)
  const support = getSupportDimensions(params)

  if (params.frameWidth >= outerRadius) {
    issues.push({
      code: 'screen-frame',
      severity: 'error',
      message: 'O aro consome todo o diâmetro da tela. Reduza o aro ou aumente o diâmetro.',
    })
  } else if (pattern.cells.length === 0) {
    issues.push({
      code: 'screen-empty',
      severity: 'warning',
      message: 'Nenhum favo cabe na área interna com a abertura atual. Reduza a abertura ou o aro.',
    })
  } else if (
    pattern.innerRadius !== null &&
    params.opening >= pattern.innerRadius
  ) {
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

  if (pattern.effectiveLine < MINIMUM_LINE_MM - 1e-9) {
    issues.push({
      code: 'screen-line',
      severity: 'warning',
      message: `A linha efetiva fica abaixo de ${MINIMUM_LINE_MM} mm.`,
    })
  }

  // Guardas defensivas para chamadores diretos fora dos intervalos do Zod; a UI
  // não alcança estes casos.
  if (support.ledgeOverlap <= 0) {
    issues.push({
      code: 'support-step',
      severity: 'error',
      message: 'O degrau não sustenta a tela. Aumente a largura do degrau ou reduza a folga.',
    })
  } else if (support.ledgeOverlap < 1) {
    issues.push({
      code: 'support-step',
      severity: 'warning',
      message: 'O degrau sustenta menos de 1 mm da tela; aumente a largura do degrau.',
    })
  }

  if (params.stepWidth - params.fitClearance > params.frameWidth) {
    issues.push({
      code: 'support-step-frame',
      severity: 'warning',
      message: 'O degrau avança sob a área perfurada da tela; reduza o degrau ou aumente o aro.',
    })
  }

  if (params.wallThickness < MINIMUM_SUPPORT_MM) {
    issues.push({
      code: 'support-wall',
      severity: 'error',
      message: `A parede do suporte fica abaixo do mínimo de ${MINIMUM_SUPPORT_MM} mm.`,
    })
  }

  if (params.bottomThickness < MINIMUM_SUPPORT_MM) {
    issues.push({
      code: 'support-bottom',
      severity: 'error',
      message: `O fundo do suporte é menor que o mínimo de ${MINIMUM_SUPPORT_MM} mm.`,
    })
  }

  if (params.fitClearance < 0.2) {
    issues.push({
      code: 'support-clearance',
      severity: 'warning',
      message: 'A folga da tela está abaixo de 0,2 mm; o encaixe pode ficar apertado.',
    })
  }

  if (support.bowlDepthLimited) {
    issues.push({
      code: 'support-depth',
      severity: 'warning',
      message: `A profundidade da bacia foi limitada a ${support.effectiveBowlDepth.toFixed(1)} mm para manter a parede e a forma imprimível da bacia.`,
    })
  } else if (params.bowlDepth <= 0) {
    issues.push({
      code: 'support-depth',
      severity: 'warning',
      message: 'A profundidade da bacia precisa ser maior que zero.',
    })
  }

  const plug = getPlugDimensions(params)

  if (plug.guideRadius - plug.contactRadius <= 0) {
    issues.push({
      code: 'plug-guide',
      severity: 'error',
      message:
        'O macho não tem coroa de contato. Aumente a largura do degrau ou reduza a folga da tela.',
    })
  }

  return issues
}
