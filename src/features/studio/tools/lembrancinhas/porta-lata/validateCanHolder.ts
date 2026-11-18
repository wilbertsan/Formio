import {
  HANDLE_FIT_INTERFERENCE,
  MAX_TEXT_ARC,
  MINIMUM_BOTTOM_MM,
  MINIMUM_WALL_MM,
  MIN_EXPOSED_MM,
  MIN_TOP_LAND_MM,
  TEXT_BAND_MARGIN_MM,
  getEffectiveRimChamfer,
  getExposedHeight,
  getInnerDiameter,
  getOuterHeight,
  getOuterRadius,
  type CanHolderGeometryParams,
} from './schema'
import { getHandleMetrics } from './shapes'

/** Margem entre o vão vertical da alça e a borda ou o fundo. */
const HANDLE_MARGIN_MM = 2
/** Abertura horizontal mínima confortável para a mão. */
const MIN_HAND_OPENING_MM = 16
/** Abertura vertical mínima confortável para a mão. */
export const MIN_HANDLE_GAP_MM = 26
/** Faixa defensiva da profundidade da cavidade, espelhando o schema. */
const MIN_CAVITY_MM = 80
const MAX_CAVITY_MM = 118
/** Faixa defensiva da folga da lata, espelhando o schema. */
const MIN_CAN_CLEARANCE_MM = 0.5
const MAX_CAN_CLEARANCE_MM = 1.2
/** Anel de apoio mínimo entre o furo de ventilação e a parede interna. */
const MIN_VENT_RING_MM = 3
/** Tolerância para limites exatos, evitando falso positivo do ponto flutuante. */
const BOUNDARY_EPSILON = 1e-9
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

export type CanHolderIssueCode =
  | 'can-cavity'
  | 'can-clearance'
  | 'can-vent'
  | 'can-rim'
  | 'can-wall'
  | 'can-bottom'
  | 'can-text-fit'
  | 'can-text-band'
  | 'can-handle-gap'
  | 'can-handle-reach'
  | 'can-handle-fit'
  | 'can-handle-band'

export interface ValidationIssue {
  code: CanHolderIssueCode
  severity: IssueSeverity
  message: string
}

/** Estimativa conservadora usada na validação; o build usa a fonte real e faz auto-fit. */
export function estimateTextWidth(text: string, size: number): number {
  return text.trim().length * size * TEXT_WIDTH_FACTOR
}

export function validateCanHolder(params: CanHolderGeometryParams): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const text = params.text.trim()
  const chamfer = getEffectiveRimChamfer(params)

  if (
    params.cavityDepth < MIN_CAVITY_MM ||
    params.cavityDepth > MAX_CAVITY_MM ||
    getExposedHeight(params) < MIN_EXPOSED_MM
  ) {
    issues.push({
      code: 'can-cavity',
      severity: 'error',
      message: `A cavidade precisa ficar entre ${MIN_CAVITY_MM} e ${MAX_CAVITY_MM} mm e deixar pelo menos ${MIN_EXPOSED_MM} mm da lata expostos.`,
    })
  }

  if (
    params.canClearance < MIN_CAN_CLEARANCE_MM ||
    params.canClearance > MAX_CAN_CLEARANCE_MM
  ) {
    issues.push({
      code: 'can-clearance',
      severity: 'warning',
      message: `A folga da lata precisa ficar entre ${MIN_CAN_CLEARANCE_MM} e ${MAX_CAN_CLEARANCE_MM} mm.`,
    })
  }

  if (params.ventHoleDiameter / 2 > getInnerDiameter(params) / 2 - MIN_VENT_RING_MM) {
    issues.push({
      code: 'can-vent',
      severity: 'error',
      message: 'O furo de ventilação é grande demais e deixa pouco apoio para a lata.',
    })
  }

  // Regra crua, antes do clamp do perfil: avisa quando a borda de entrada e o
  // chanfro precisam ser reduzidos para preservar a parede do topo.
  if (params.wallThickness - params.rimChamfer - params.rimLeadIn < MIN_TOP_LAND_MM - BOUNDARY_EPSILON) {
    issues.push({
      code: 'can-rim',
      severity: 'error',
      message: `A parede do topo precisa ter pelo menos ${MIN_TOP_LAND_MM} mm.`,
    })
  }

  if (params.wallThickness < MINIMUM_WALL_MM) {
    issues.push({
      code: 'can-wall',
      severity: 'error',
      message: `A parede precisa ter pelo menos ${MINIMUM_WALL_MM} mm.`,
    })
  }

  if (params.bottomThickness < MINIMUM_BOTTOM_MM) {
    issues.push({
      code: 'can-bottom',
      severity: 'error',
      message: `O fundo precisa ter pelo menos ${MINIMUM_BOTTOM_MM} mm.`,
    })
  }

  if (text.length > 0) {
    const outerRadius = getOuterRadius(params)
    const arc = estimateTextWidth(text, params.textSize) / outerRadius
    if (arc > MAX_TEXT_ARC) {
      issues.push({
        code: 'can-text-fit',
        severity: 'warning',
        message: 'O texto pode ser reduzido para caber no arco do porta-lata.',
      })
    }

    const fitScale = Math.min(1, MAX_TEXT_ARC / arc)
    const halfHeight = ((params.textSize * GLYPH_HEIGHT_FACTOR) / 2) * fitScale
    const minY = params.bottomThickness + TEXT_BAND_MARGIN_MM
    const maxY = getOuterHeight(params) - chamfer - TEXT_BAND_MARGIN_MM
    if (params.textCenterY - halfHeight < minY || params.textCenterY + halfHeight > maxY) {
      issues.push({
        code: 'can-text-band',
        severity: 'error',
        message: 'O texto cruza a borda ou o fundo do porta-lata. Ajuste a altura ou o tamanho.',
      })
    }
  }

  if (params.handleEnabled) {
    const metrics = getHandleMetrics(params)
    if (params.handleGap < MIN_HANDLE_GAP_MM) {
      issues.push({
        code: 'can-handle-gap',
        severity: 'warning',
        message: 'A abertura vertical da mão está pequena; o conforto fica comprometido.',
      })
    }
    if (metrics.handOpeningMinWidth < MIN_HAND_OPENING_MM) {
      issues.push({
        code: 'can-handle-reach',
        severity: 'warning',
        message: 'O alcance da alça não deixa abertura suficiente para a mão.',
      })
    }
    if (params.handleClearance > HANDLE_FIT_INTERFERENCE) {
      issues.push({
        code: 'can-handle-fit',
        severity: 'warning',
        message: 'A folga no meio da abraçadeira está alta; a alça fica apoiada no topo.',
      })
    }

    // A regra cobre só a banda da abraçadeira (handleHeight ± handleWidth/2):
    // é ela que precisa ficar sobre a parede. O laço em D pode passar da borda
    // superior do porta-lata sem invalidar a peça. Os docs de plano/design
    // ainda falam do vão completo do laço e serão alinhados na tarefa de docs.
    const bandMinY = params.handleHeight - params.handleWidth / 2
    const bandMaxY = params.handleHeight + params.handleWidth / 2
    // O limite inferior é defensivo: com handleHeight ≥ 35 e handleWidth ≤ 16 a
    // banda nunca começa abaixo de 27 mm.
    if (
      bandMinY < HANDLE_MARGIN_MM ||
      bandMaxY > getOuterHeight(params) - chamfer - HANDLE_MARGIN_MM
    ) {
      issues.push({
        code: 'can-handle-band',
        severity: 'error',
        message: 'A alça não cabe na altura do corpo. Ajuste a altura ou a largura da alça.',
      })
    }
  }

  return issues
}
