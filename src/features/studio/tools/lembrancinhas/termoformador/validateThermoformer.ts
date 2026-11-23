import {
  pathsBoundingBox,
  type ClipperPoint,
} from '../../confeitaria/shared/textOutline'
import { computeScreenPattern } from './screenPattern'
import { getSupportDimensions } from './buildSupport'
import { getPlugDimensions } from './buildPlug'
import type { ShapeOutline } from './outline'
import { getTrayDimensions, getTrayEnvelope } from './tray'
import {
  MAX_SCREEN_OPENINGS,
  MAXIMUM_SHAPE_MM,
  MINIMUM_DRAFT_ANGLE_DEG,
  MINIMUM_GRIP_RADIUS_MM,
  MINIMUM_LINE_MM,
  MINIMUM_PYRAMID_TIP_MM,
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
  | 'support-step-clamped'
  | 'support-wall'
  | 'support-bottom'
  | 'support-clearance'
  | 'support-depth'
  | 'support-draft'
  | 'support-tip'
  | 'plug-guide'
  | 'plug-grip'
  | 'svg-missing'
  | 'svg-parse'
  | 'svg-contour'
  | 'svg-feature'
  | 'svg-size'

export interface ValidationIssue {
  code: ThermoformerIssueCode
  severity: IssueSeverity
  message: string
}

export interface SvgValidationError {
  code: string
  message: string
}

const EPS = 1e-6
/** Acima disso o contorno do SVG encarece o CSG sem ganho visual. */
const SVG_POINT_LIMIT = 1500
const SVG_ERROR_CODES = ['svg-missing', 'svg-parse', 'svg-contour'] as const
type SvgErrorCode = (typeof SVG_ERROR_CODES)[number]

/** Mensagens próprias para não repetir o alerta curto do upload. */
const SVG_ERROR_MESSAGES: Record<SvgErrorCode, string> = {
  'svg-missing': 'Envie um arquivo SVG para gerar a tela.',
  'svg-parse': 'O arquivo SVG não pôde ser lido. Verifique o XML.',
  'svg-contour': 'O SVG precisa ter uma única silhueta fechada, sem furos ou ilhas.',
}

function isSvgErrorCode(code: string): code is SvgErrorCode {
  return (SVG_ERROR_CODES as readonly string[]).includes(code)
}

function validateCircle(params: ThermoformerGeometryParams): ValidationIssue[] {
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

function isSingleContour(paths: ClipperPoint[][] | null): boolean {
  return paths !== null && paths.length === 1 && paths[0].length >= 3
}

/**
 * O worker recusa a geometria quando um offset do SVG deixa de ser uma
 * silhueta única (`singleContour`). Repetimos a checagem aqui para o painel
 * explicar o erro antes do build, incluindo o custo de um contorno denso.
 */
function svgFeatureIssue(outline: ShapeOutline): ValidationIssue | null {
  if (outline.points.length > SVG_POINT_LIMIT) {
    return {
      code: 'svg-feature',
      severity: 'error',
      message: `O SVG tem ${outline.points.length} pontos; o limite é ${SVG_POINT_LIMIT}. Simplifique o contorno.`,
    }
  }

  const labels: Array<[ClipperPoint[][] | null, string]> = [
    [outline.supportOuter, 'externo do suporte'],
    [outline.recess, 'do rebaixo'],
    [outline.cavityOpening, 'da abertura da cavidade'],
  ]
  for (const [paths, label] of labels) {
    if (!isSingleContour(paths)) {
      return {
        code: 'svg-feature',
        severity: 'error',
        message: `O contorno ${label} do SVG não fecha em uma única silhueta. Reduza o aro/degrau ou simplifique o SVG.`,
      }
    }
  }

  return null
}

function validateShape(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline | null,
  svgError: SvgValidationError | null,
): ValidationIssue[] {
  if (params.shape === 'svg') {
    if (svgError) {
      const code = isSvgErrorCode(svgError.code) ? svgError.code : 'svg-parse'
      return [{
        code,
        severity: 'error',
        message: SVG_ERROR_MESSAGES[code],
      }]
    }
    if (!outline) {
      return [{
        code: 'svg-contour',
        severity: 'error',
        message: SVG_ERROR_MESSAGES['svg-contour'],
      }]
    }
  }

  if (!outline || outline.kind !== 'polygon') return []

  const issues: ValidationIssue[] = []

  if (params.shape === 'svg') {
    const feature = svgFeatureIssue(outline)
    // Um contorno dividido também encarece o resto da validação; o erro já
    // bloqueia o build, então não seguimos para o padrão e a bandeja.
    if (feature) return [feature]

    const screenSpan = Math.max(outline.bounds.width, outline.bounds.height)
    if (screenSpan > MAXIMUM_SHAPE_MM + EPS) {
      issues.push({
        code: 'svg-size',
        severity: 'error',
        message: `A tela do SVG (${screenSpan.toFixed(1)} mm) passa do máximo de ${MAXIMUM_SHAPE_MM} mm. Reduza o tamanho do SVG.`,
      })
    }
  }

  const pattern = computeScreenPattern(params, outline)
  const envelope = getTrayEnvelope(params, outline)

  const perforated = outline.perforated ?? []
  const perforatedBounds = pathsBoundingBox(perforated)
  const frameEmpty =
    perforated.length === 0 ||
    perforatedBounds.width <= EPS ||
    perforatedBounds.height <= EPS

  if (frameEmpty) {
    issues.push({
      code: 'screen-frame',
      severity: 'error',
      message: 'O aro consome toda a forma da tela. Reduza o aro ou aumente a forma.',
    })
  } else if (pattern.cells.length === 0) {
    issues.push({
      code: 'screen-empty',
      severity: 'warning',
      message: 'Nenhum favo cabe na área perfurada com a abertura atual. Reduza a abertura ou o aro.',
    })
  } else {
    const minInner = Math.min(
      pattern.innerBounds.width,
      pattern.innerBounds.height,
    )
    if (minInner > EPS && params.opening >= minInner / 2) {
      issues.push({
        code: 'screen-opening',
        severity: 'warning',
        message: 'A abertura do favo ocupa a menor dimensão da área perfurada. Reduza a abertura ou o aro.',
      })
    }
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

  if (envelope.stepClamped) {
    issues.push({
      code: 'support-step-clamped',
      severity: 'warning',
      message: 'O degrau efetivo foi ampliado para caber sob a moldura da tela.',
    })
  }

  if (envelope.effectiveStep > params.frameWidth + params.fitClearance + EPS) {
    issues.push({
      code: 'support-step-frame',
      severity: 'warning',
      message: 'O degrau avança sob a área perfurada da tela; reduza o degrau ou aumente o aro.',
    })
  }

  if (envelope.draftLow) {
    issues.push({
      code: 'support-draft',
      severity: 'warning',
      message: `O ângulo de saída está abaixo de ${MINIMUM_DRAFT_ANGLE_DEG}°; a bandeja pode ficar difícil de desmoldar.`,
    })
  }

  if (envelope.tipSmall) {
    issues.push({
      code: 'support-tip',
      severity: 'warning',
      message: `O fundo da pirâmide fica menor que ${MINIMUM_PYRAMID_TIP_MM} mm; aumente a base ou o fundo.`,
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

  if (envelope.depthLimited) {
    issues.push({
      code: 'support-depth',
      severity: 'warning',
      message: `A profundidade da bacia foi limitada a ${envelope.effectiveDepth.toFixed(1)} mm para manter o fundo mínimo da bandeja.`,
    })
  } else if (params.bowlDepth <= 0) {
    issues.push({
      code: 'support-depth',
      severity: 'warning',
      message: 'A profundidade da bacia precisa ser maior que zero.',
    })
  }

  const tray = getTrayDimensions(params, outline)
  if (
    !tray.gripEnabled ||
    tray.gripRadius < MINIMUM_GRIP_RADIUS_MM * 2
  ) {
    issues.push({
      code: 'plug-grip',
      severity: 'warning',
      message: 'A pega do macho não cabe nesta forma; o macho será impresso com o topo plano.',
    })
  }

  return issues
}

export function validateThermoformer(
  params: ThermoformerGeometryParams,
  outline?: ShapeOutline | null,
  svgError?: SvgValidationError | null,
): ValidationIssue[] {
  if (params.shape === 'circle') return validateCircle(params)
  return validateShape(params, outline ?? null, svgError ?? null)
}
