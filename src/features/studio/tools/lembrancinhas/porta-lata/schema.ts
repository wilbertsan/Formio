import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PRODUCT_TYPE = 'porta-lata' as const

export const CAN_DIAMETER = 66.2
export const CAN_HEIGHT = 122.2
export const CAN_TOP_DIAMETER = 54
export const CAN_VOLUME_ML = 350
export const MIN_EXPOSED_MM = 6
export const MIN_TOP_LAND_MM = 0.8
/** Margem entre o texto e a borda ou o fundo do corpo. */
export const TEXT_BAND_MARGIN_MM = 2
export const BASE_CHAMFER_MM = 0.4
/** Face plana mínima no centro do anel decorativo. */
export const MIN_EDGE_RIM_FLAT_MM = 1

export const MINIMUM_WALL_MM = 1.8
export const MINIMUM_BOTTOM_MM = 2
export const CONTENT_DEPTH = 1
export const HOLDER_SEGMENTS = 128
export const HANDLE_RING_THICKNESS = 3.5
export const HANDLE_FIT_INTERFERENCE = 0.4
export const HANDLE_LOOP_INSET = 2.0
export const HANDLE_WRAP = (200 * Math.PI) / 180
export const MAX_TEXT_LENGTH = 20
export const MAX_TEXT_ARC = (120 * Math.PI) / 180
export const RELIEF_EMBED = 0.2

export const FONT_STYLES = ['normal', 'bold', 'serif'] as const
export type FontStyle = (typeof FONT_STYLES)[number]

export const TEXTURE_STYLES = [
  'none', 'wood', 'metal', 'scales', 'waves', 'stone', 'spikes',
] as const
export type TextureStyle = (typeof TEXTURE_STYLES)[number]

export const TEXTURE_RADIAL_SEGMENTS = 256
export const TEXTURE_STEP_MM = 1
export const TEXTURE_EDGE_FADE_MM = 2
export const TEXTURE_HANDLE_GAP_MM = 1
export const TEXTURE_HANDLE_FADE_MM = 2

export const canHolderParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  cavityDepth: z.number().min(80).max(116),
  canClearance: z.number().min(0.5).max(1.2),
  wallThickness: z.number().min(MINIMUM_WALL_MM).max(4),
  bottomThickness: z.number().min(MINIMUM_BOTTOM_MM).max(6),
  ventHoleDiameter: z.number().min(6).max(14),
  rimLeadIn: z.number().min(0.5).max(2),
  rimChamfer: z.number().min(0).max(1.5),
  edgeRimEnabled: z.boolean(),
  edgeRimProtrusion: z.number().min(0.4).max(1.5),
  edgeRimWidth: z.number().min(4).max(14),
  textureStyle: z.enum(TEXTURE_STYLES),
  textureDepth: z.number().min(0.4).max(1.5),
  textureScale: z.number().min(4).max(16),
  handleEnabled: z.boolean(),
  handleHeight: z.number().min(35).max(85),
  handleGap: z.number().min(24).max(40),
  handleReach: z.number().min(30).max(50),
  handleBand: z.number().min(5).max(10),
  handleWidth: z.number().min(8).max(16),
  handleClearance: z.number().min(0.2).max(0.5),
  // Code points, não unidades UTF-16: não quebra pares substitutos.
  text: z.string().refine(
    (value) => Array.from(value).length <= MAX_TEXT_LENGTH,
    { message: `O texto deve ter no máximo ${MAX_TEXT_LENGTH} caracteres.` },
  ),
  textSize: z.number().min(6).max(18),
  fontStyle: z.enum(FONT_STYLES),
  textCenterY: z.number().min(20).max(90),
  bodyColor: z.enum(PLA_COLORS),
  accentColor: z.enum(PLA_COLORS),
})

export type CanHolderParams = z.infer<typeof canHolderParamsSchema>

/** Campos que alteram geometria. Cores ficam de fora para não rebuildar. */
export const canHolderGeometryParamsSchema = canHolderParamsSchema.omit({
  bodyColor: true,
  accentColor: true,
})

export type CanHolderGeometryParams = z.infer<typeof canHolderGeometryParamsSchema>

export const defaultCanHolderParams: CanHolderParams = {
  productType: PRODUCT_TYPE,
  cavityDepth: 108,
  canClearance: 0.8,
  wallThickness: 2.4,
  bottomThickness: 3.2,
  ventHoleDiameter: 10,
  rimLeadIn: 1.0,
  rimChamfer: 0.4,
  edgeRimEnabled: true,
  edgeRimProtrusion: 1.0,
  edgeRimWidth: 6,
  textureStyle: 'none',
  textureDepth: 0.8,
  textureScale: 8,
  handleEnabled: true,
  handleHeight: 60,
  handleGap: 30,
  handleReach: 40,
  handleBand: 6.5,
  handleWidth: 12,
  handleClearance: 0.3,
  text: 'Festa',
  textSize: 10,
  fontStyle: 'normal',
  textCenterY: 60,
  bodyColor: '#14b8a6',
  accentColor: '#f5f5f5',
}

export function getInnerDiameter(params: CanHolderGeometryParams): number {
  return CAN_DIAMETER + 2 * params.canClearance
}

export function getOuterRadius(params: CanHolderGeometryParams): number {
  return (getInnerDiameter(params) + 2 * params.wallThickness) / 2
}

export function getOuterDiameter(params: CanHolderGeometryParams): number {
  return getOuterRadius(params) * 2
}

export function getOuterHeight(params: CanHolderGeometryParams): number {
  return params.cavityDepth + params.bottomThickness
}

export function getExposedHeight(params: CanHolderGeometryParams): number {
  return CAN_HEIGHT - params.cavityDepth
}

export function getEffectiveLeadIn(params: CanHolderGeometryParams): number {
  return Math.max(0, Math.min(params.rimLeadIn, params.wallThickness - MIN_TOP_LAND_MM))
}

export function getEffectiveRimChamfer(params: CanHolderGeometryParams): number {
  return Math.max(
    0,
    Math.min(
      params.rimChamfer,
      params.wallThickness - getEffectiveLeadIn(params) - MIN_TOP_LAND_MM,
    ),
  )
}

/**
 * Salto radial efetivo dos anéis: 0 quando desligados e limitado para preservar
 * `MIN_EDGE_RIM_FLAT_MM` de largura no anel.
 *
 * Cada anel tem um único flanco de 45°; a aresta oposta é o chanfro de base
 * (anel inferior) ou o `rimChamfer` efetivo (anel superior). O limite
 * `(edgeRimWidth - MIN_EDGE_RIM_FLAT_MM) / 2` reserva 1 mm além do flanco,
 * então a face vertical real é ≥ 1 mm (igual no pior caso).
 *
 * O clamp é defensivo; inalcançável pelo schema (`edgeRimWidth` ≥ 4 e
 * `edgeRimProtrusion` ≤ 1.5). Ele só reduz objetos construídos fora do Zod.
 */
export function getEffectiveRingProtrusion(params: CanHolderGeometryParams): number {
  if (!params.edgeRimEnabled) return 0
  return Math.max(
    0,
    Math.min(
      params.edgeRimProtrusion,
      (params.edgeRimWidth - MIN_EDGE_RIM_FLAT_MM) / 2,
    ),
  )
}

/** Profundidade efetiva: limitada a um quarto da escala para manter os flancos ≤ 45°. */
export function getEffectiveTextureDepth(params: CanHolderGeometryParams): number {
  if (params.textureStyle === 'none') return 0
  return Math.min(params.textureDepth, params.textureScale / 4)
}

/** Envelope radial da textura: 0 com `none`, senão a profundidade efetiva. */
export function getTextureEnvelope(params: CanHolderGeometryParams): number {
  return getEffectiveTextureDepth(params)
}

/** Diâmetro externo do corpo com o maior envelope (anel ou textura); não inclui o relevo do texto. */
export function getMaxOuterDiameter(params: CanHolderGeometryParams): number {
  const envelope = Math.max(
    getEffectiveRingProtrusion(params),
    getTextureEnvelope(params),
  )
  return getOuterDiameter(params) + 2 * envelope
}

export function getTopLand(params: CanHolderGeometryParams): number {
  return (
    params.wallThickness -
    getEffectiveRimChamfer(params) -
    getEffectiveLeadIn(params) +
    getEffectiveRingProtrusion(params)
  )
}

export interface TextBand {
  min: number
  max: number
}

/**
 * Faixa vertical da parede cilíndrica entre os anéis decorativos, sem margem.
 * `max` é o fim da parede em `height - ringWidth` quando os anéis estão
 * ligados, ou a altura do corpo quando desligados.
 */
export function getRingWallBand(params: CanHolderGeometryParams): TextBand {
  const ringWidth = params.edgeRimEnabled ? params.edgeRimWidth : 0
  return { min: ringWidth, max: getOuterHeight(params) - ringWidth }
}

/**
 * Faixa vertical disponível para o texto: entre o fundo e a borda de entrada,
 * descontando os anéis decorativos quando ligados, com `TEXT_BAND_MARGIN_MM` de
 * margem em cada ponta.
 */
export function getTextBand(params: CanHolderGeometryParams): TextBand {
  const wall = getRingWallBand(params)
  return {
    min: Math.max(params.bottomThickness, wall.min) + TEXT_BAND_MARGIN_MM,
    max:
      Math.min(getOuterHeight(params) - getEffectiveRimChamfer(params), wall.max) -
      TEXT_BAND_MARGIN_MM,
  }
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'porta-lata'
}
