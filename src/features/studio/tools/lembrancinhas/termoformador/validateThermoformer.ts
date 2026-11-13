import { computePanelPattern } from './panelPattern'
import {
  MINIMUM_FEATURE_MM,
  MINIMUM_WALL_MM,
  type ThermoformerGeometryParams,
} from './schema'

export type IssueSeverity = 'error' | 'warning'

export interface ValidationIssue {
  code: string
  severity: IssueSeverity
  message: string
}

export function validateThermoformer(
  params: ThermoformerGeometryParams,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const bodyTop = params.height + params.rimHeight
  const halfMin = Math.min(params.width, params.depth) / 2
  const pattern = computePanelPattern(params)

  if (params.cornerRadius > halfMin) {
    issues.push({
      code: 'corner-radius',
      severity: 'error',
      message: 'O raio dos cantos excede metade da menor dimensão do corpo.',
    })
  }

  if (params.wallThickness < MINIMUM_WALL_MM) {
    issues.push({
      code: 'wall',
      severity: 'error',
      message: `A parede é menor que o mínimo de ${MINIMUM_WALL_MM} mm.`,
    })
  }

  if (pattern.innerWidth <= 0 || pattern.innerHeight <= 0) {
    issues.push({
      code: 'panel-border',
      severity: 'error',
      message: 'A moldura do painel não deixa área para a grade. Reduza a borda ou aumente o painel.',
    })
  } else if (pattern.holes.length === 0) {
    issues.push({
      code: 'panel-empty',
      severity: 'warning',
      message: 'Nenhum furo cabe na região interna com o espaçamento atual.',
    })
  }

  if (pattern.effectiveRib < MINIMUM_FEATURE_MM) {
    issues.push({
      code: 'panel-rib',
      severity: 'warning',
      message: `As nervuras efetivas ficam abaixo de ${MINIMUM_FEATURE_MM} mm; o furo foi reduzido.`,
    })
  }

  if (pattern.capped) {
    issues.push({
      code: 'panel-density',
      severity: 'warning',
      message: 'A grade foi limitada em aberturas para manter o desempenho. Aumente o espaçamento.',
    })
  }

  if (params.frontPanelWidth > params.width) {
    issues.push({
      code: 'panel-overhang',
      severity: 'warning',
      message: 'O painel é mais largo que o corpo e vai sobressair nas laterais.',
    })
  }

  if (params.frontPanelHeight > bodyTop) {
    issues.push({
      code: 'panel-height',
      severity: 'warning',
      message: 'O painel é mais alto que o corpo e vai sobressair na borda.',
    })
  }

  const panelHalfMin = Math.min(params.frontPanelWidth, params.frontPanelHeight) / 2
  if (params.frontPanelCornerRadius > panelHalfMin) {
    issues.push({
      code: 'panel-radius',
      severity: 'error',
      message: 'O raio do painel excede metade da menor dimensão do painel.',
    })
  }

  if (params.lidEnabled) {
    if (params.lidClearance < params.printClearance) {
      issues.push({
        code: 'lid-clearance',
        severity: 'warning',
        message: 'A folga da tampa é menor que a folga de impressão.',
      })
    }

    if (params.lidFitDepth > bodyTop) {
      issues.push({
        code: 'lid-fit-depth',
        severity: 'warning',
        message: 'A profundidade de encaixe da tampa é maior que a altura do corpo.',
      })
    }

    const rimThickness = Math.max(params.wallThickness, params.rimThickness)
    const openingWidth = params.width - 2 * rimThickness - 2 * params.lidClearance
    const openingDepth = params.depth - 2 * rimThickness - 2 * params.lidClearance
    if (params.fitType === 'internal'
      && (openingWidth <= 2 * params.lidThickness || openingDepth <= 2 * params.lidThickness)) {
      issues.push({
        code: 'lid-internal',
        severity: 'error',
        message: 'A tampa interna não tem parede suficiente para formar a cavidade.',
      })
    }
  }

  if (params.handleEnabled) {
    if (params.handleTipRadius > params.handleDiameter / 2) {
      issues.push({
        code: 'handle-tip',
        severity: 'warning',
        message: 'A ponta do pino é maior que o raio da haste e será limitada.',
      })
    }
    if (params.handleBaseDiameter < params.handleDiameter) {
      issues.push({
        code: 'handle-base',
        severity: 'warning',
        message: 'A base do pino é menor que a haste; a base será igualada à haste.',
      })
    }
    const flange = Math.max(params.handleBaseDiameter, params.handleDiameter)
    const available = params.handleSide === 'left' || params.handleSide === 'right'
      ? Math.min(bodyTop, params.depth)
      : Math.min(params.width, params.depth)
    if (flange > available) {
      issues.push({
        code: 'handle-flange',
        severity: 'warning',
        message: 'O flange do pino é maior que a lateral disponível.',
      })
    }
  }

  if (params.baseEnabled) {
    if (params.baseHeight > bodyTop) {
      issues.push({
        code: 'base-height',
        severity: 'warning',
        message: 'A base é mais alta que o corpo.',
      })
    }
    if (params.baseHeight > 0 && params.baseHeight < MINIMUM_FEATURE_MM) {
      issues.push({
        code: 'base-thin',
        severity: 'warning',
        message: `A altura da base é menor que ${MINIMUM_FEATURE_MM} mm.`,
      })
    }
  }

  return issues
}
