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

export const canHolderParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  cavityDepth: z.number().min(80).max(116),
  canClearance: z.number().min(0.5).max(1.2),
  wallThickness: z.number().min(MINIMUM_WALL_MM).max(4),
  bottomThickness: z.number().min(MINIMUM_BOTTOM_MM).max(6),
  ventHoleDiameter: z.number().min(6).max(14),
  rimLeadIn: z.number().min(0.5).max(2),
  rimChamfer: z.number().min(0).max(1.5),
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

export function getTopLand(params: CanHolderGeometryParams): number {
  return params.wallThickness - getEffectiveRimChamfer(params) - getEffectiveLeadIn(params)
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'porta-lata'
}
