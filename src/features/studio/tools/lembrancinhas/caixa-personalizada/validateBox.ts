import { computePanelPattern } from './panelPattern'
import {
  MINIMUM_FEATURE_MM,
  MINIMUM_WALL_MM,
  type BoxGeometryParams,
} from './schema'

export type IssueSeverity = 'error' | 'warning'

export type BoxIssueCode =
  | 'corner-radius'
  | 'wall'
  | 'panel-border'
  | 'panel-empty'
  | 'panel-hole'
  | 'panel-rib'
  | 'panel-density'
  | 'panel-overhang'
  | 'panel-height'
  | 'panel-radius'
  | 'panel-base'
  | 'panel-lid'
  | 'lid-clearance'
  | 'lid-fit-depth'
  | 'lid-internal'
  | 'handle-tip'
  | 'handle-base'
  | 'handle-flange'
  | 'handle-side'
  | 'handle-base-collision'
  | 'handle-lid-collision'
  | 'base-height'
  | 'base-thin'

export interface ValidationIssue {
  code: BoxIssueCode
  severity: IssueSeverity
  message: string
}

export function validateBox(
  params: BoxGeometryParams,
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

  // Guarda defensiva para chamadores diretos fora dos intervalos do Zod; a UI não alcança este caso.
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

  if (pattern.holes.length > 0 && pattern.effectiveSize < MINIMUM_FEATURE_MM - 1e-9) {
    issues.push({
      code: 'panel-hole',
      severity: 'warning',
      message: `Os furos efetivos ficam abaixo de ${MINIMUM_FEATURE_MM} mm.`,
    })
  }

  if (pattern.holes.length > 0 && pattern.effectiveRib < MINIMUM_FEATURE_MM - 1e-9) {
    issues.push({
      code: 'panel-rib',
      severity: 'warning',
      message: `As nervuras efetivas ficam abaixo de ${MINIMUM_FEATURE_MM} mm.`,
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

    const maxInternalFit = Math.max(0, bodyTop - params.bottomThickness)
    if (params.fitType === 'internal' && params.lidFitDepth > maxInternalFit) {
      issues.push({
        code: 'lid-fit-depth',
        severity: 'warning',
        message: 'O encaixe interno foi limitado para não atingir o fundo do corpo.',
      })
    } else if (params.fitType === 'external' && params.lidFitDepth > bodyTop) {
      issues.push({
        code: 'lid-fit-depth',
        severity: 'warning',
        message: 'A profundidade de encaixe da tampa é maior que a altura do corpo.',
      })
    }

    const rimThickness = Math.max(params.wallThickness, params.rimThickness)
    const openingWidth = params.width - 2 * rimThickness - 2 * params.lidClearance
    const openingDepth = params.depth - 2 * rimThickness - 2 * params.lidClearance
    // Guarda defensiva para chamadores diretos fora dos intervalos do Zod; a UI não alcança este caso.
    if (params.fitType === 'internal'
      && (openingWidth <= 2 * params.lidThickness || openingDepth <= 2 * params.lidThickness)) {
      issues.push({
        code: 'lid-internal',
        severity: 'error',
        message: 'A tampa interna não tem parede suficiente para formar a cavidade.',
      })
    }
  }

  const panelBottom = bodyTop / 2 - params.frontPanelHeight / 2
  const panelTop = bodyTop / 2 + params.frontPanelHeight / 2
  const lidBottom = bodyTop - params.lidFitDepth

  if (params.baseEnabled && panelBottom < params.baseHeight) {
    issues.push({
      code: 'panel-base',
      severity: 'warning',
      message: 'O painel decorativo invade a altura da base. Reduza a base, o painel ou reposicione o painel.',
    })
  }

  if (params.lidEnabled && panelTop > lidBottom) {
    issues.push({
      code: 'panel-lid',
      severity: 'warning',
      message: 'O painel decorativo invade a saia da tampa. Reduza o painel, a profundidade do encaixe ou aumente a altura do corpo.',
    })
  }

  if (params.handleEnabled) {
    if (params.handleSide === 'top' || params.handleSide === 'bottom') {
      issues.push({
        code: 'handle-side',
        severity: 'warning',
        message: 'Puxador no topo/fundo fica sem apoio sólido na v1. Use esquerda ou direita.',
      })
    } else {
      const flangeRadius = Math.max(params.handleBaseDiameter, params.handleDiameter) / 2
      const vertical = Math.max(
        flangeRadius,
        Math.min(
          params.handleHeight * bodyTop,
          Math.max(flangeRadius, bodyTop - flangeRadius),
        ),
      )
      if (params.baseEnabled && vertical - flangeRadius < params.baseHeight) {
        issues.push({
          code: 'handle-base-collision',
          severity: 'warning',
          message: 'O flange do puxador invade a base. Aumente a posição do puxador.',
        })
      }
      if (params.lidEnabled && vertical + flangeRadius > lidBottom) {
        issues.push({
          code: 'handle-lid-collision',
          severity: 'warning',
          message: 'O flange do puxador invade a tampa. Reduza a posição do puxador.',
        })
      }
    }

    if (params.handleTipRadius > params.handleDiameter / 2) {
      issues.push({
        code: 'handle-tip',
        severity: 'warning',
        message: 'A ponta do puxador é maior que o raio da haste e será limitada.',
      })
    }
    if (params.handleBaseDiameter < params.handleDiameter) {
      issues.push({
        code: 'handle-base',
        severity: 'warning',
        message: 'A base do puxador é menor que a haste; a base será igualada à haste.',
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
        message: 'O flange do puxador é maior que a lateral disponível.',
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
    if (params.baseHeight < MINIMUM_FEATURE_MM) {
      issues.push({
        code: 'base-thin',
        severity: 'warning',
        message: `A altura da base é menor que ${MINIMUM_FEATURE_MM} mm.`,
      })
    }
  }

  return issues
}
