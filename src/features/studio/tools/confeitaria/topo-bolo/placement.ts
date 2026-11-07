import type { CakeTopperParams } from './schema'

export interface PlateBounds {
  halfWidth: number
  halfHeight: number
}

export interface OutlineSpec {
  rx: number
  ry: number
  box: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// Contorno recuado de `margin`: elipse (circle/oval) ou caixa (retângulo/custom).
export function outlineSpec(
  params: CakeTopperParams,
  plate: PlateBounds,
  margin: number,
): OutlineSpec {
  switch (params.shape) {
    case 'circle': {
      const r = Math.max(0, Math.min(params.width, params.height) / 2 - margin)
      return { rx: r, ry: r, box: false }
    }
    case 'oval':
      return {
        rx: Math.max(0, params.width / 2 - margin),
        ry: Math.max(0, params.height / 2 - margin),
        box: false,
      }
    case 'rounded-rect':
      return {
        rx: Math.max(0, params.width / 2 - margin),
        ry: Math.max(0, params.height / 2 - margin),
        box: true,
      }
    case 'custom':
      return {
        rx: Math.max(0, plate.halfWidth - margin),
        ry: Math.max(0, plate.halfHeight - margin),
        box: true,
      }
  }
}

/**
 * Encaixa o centro (dx,dy) de um retângulo `hw × hh` no contorno recuado de
 * `margin`. Nos contornos elípticos os eixos são acoplados: limita X e depois
 * Y em função do X já limitado, garantindo o canto mais distante dentro.
 */
export function clampToOutline(
  params: CakeTopperParams,
  plate: PlateBounds,
  hw: number,
  hh: number,
  dx: number,
  dy: number,
  margin: number,
): { x: number; y: number } {
  const spec = outlineSpec(params, plate, margin)
  if (spec.box) {
    const limitX = Math.max(0, spec.rx - hw)
    const limitY = Math.max(0, spec.ry - hh)
    return { x: clamp(dx, -limitX, limitX), y: clamp(dy, -limitY, limitY) }
  }

  const limitX0 = Math.max(
    0,
    spec.rx * Math.sqrt(Math.max(0, 1 - (hh * hh) / (spec.ry * spec.ry || 1))) - hw,
  )
  const x = clamp(dx, -limitX0, limitX0)
  const inner = 1 - ((Math.abs(x) + hw) / (spec.rx || 1)) ** 2
  const limitY = Math.max(0, spec.ry * Math.sqrt(Math.max(0, inner)) - hh)
  const y = clamp(dy, -limitY, limitY)
  return { x, y }
}

// Fator ≤ 1 que encolhe um retângulo centrado na origem até o canto caber no contorno.
export function fitScaleToOutline(spec: OutlineSpec, hw: number, hh: number): number {
  if (hw <= 0 || hh <= 0) return 1
  if (spec.rx <= 0 || spec.ry <= 0) return 0
  if (spec.box) return Math.min(1, spec.rx / hw, spec.ry / hh)
  const corner = (hw / spec.rx) ** 2 + (hh / spec.ry) ** 2
  return corner > 1 ? 1 / Math.sqrt(corner) : 1
}
