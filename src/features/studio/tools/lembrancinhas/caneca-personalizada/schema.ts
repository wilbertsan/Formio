import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PRODUCT_TYPE = 'caneca-personalizada' as const

export const MINIMUM_WALL_MM = 1.8
export const MINIMUM_BOTTOM_MM = 2
export const CONTENT_DEPTH = 1
export const MUG_SEGMENTS = 128
export const HANDLE_RING_THICKNESS = 3.5
export const HANDLE_WRAP = (200 * Math.PI) / 180
export const MAX_TEXT_LENGTH = 20
export const MAX_TEXT_ARC = (120 * Math.PI) / 180
export const RELIEF_EMBED = 0.2

export const FONT_STYLES = ['normal', 'bold', 'serif'] as const
export type FontStyle = (typeof FONT_STYLES)[number]

export const mugParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  diameterTop: z.number().min(70).max(100),
  diameterBottom: z.number().min(60).max(95),
  height: z.number().min(80).max(115),
  wallThickness: z.number().min(1.8).max(4),
  bottomThickness: z.number().min(2).max(6),
  rimChamfer: z.number().min(0).max(2),
  handleEnabled: z.boolean(),
  handleHeight: z.number().min(35).max(85),
  handleGap: z.number().min(24).max(40),
  handleReach: z.number().min(30).max(50),
  handleBand: z.number().min(5).max(10),
  handleWidth: z.number().min(8).max(16),
  handleClearance: z.number().min(0.2).max(0.5),
  text: z.string().max(MAX_TEXT_LENGTH),
  textSize: z.number().min(6).max(18),
  fontStyle: z.enum(FONT_STYLES),
  textCenterY: z.number().min(20).max(90),
  bodyColor: z.enum(PLA_COLORS),
  accentColor: z.enum(PLA_COLORS),
})

export type MugParams = z.infer<typeof mugParamsSchema>

/** Campos que alteram geometria. Cores ficam de fora para não rebuildar. */
export type MugGeometryParams = Omit<MugParams, 'bodyColor' | 'accentColor'>

export const defaultMugParams: MugParams = {
  productType: PRODUCT_TYPE,
  diameterTop: 80,
  diameterBottom: 72,
  height: 88,
  wallThickness: 2.4,
  bottomThickness: 3.2,
  rimChamfer: 0.6,
  handleEnabled: true,
  handleHeight: 52,
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

/** Raio externo do corpo na altura `y` (parede cônica). */
export function getOuterRadius(
  params: Pick<MugGeometryParams, 'diameterTop' | 'diameterBottom' | 'height'>,
  y: number,
): number {
  const t = Math.min(1, Math.max(0, y / params.height))
  return (params.diameterBottom / 2) * (1 - t) + (params.diameterTop / 2) * t
}

/** Volume interno útil em ml (tronco de cone). */
export function getCapacityMl(params: MugGeometryParams): number {
  const rBottom = Math.max(0, params.diameterBottom / 2 - params.wallThickness)
  const rTop = Math.max(0, params.diameterTop / 2 - params.wallThickness)
  const innerHeight = Math.max(0, params.height - params.bottomThickness)
  const volume = (Math.PI / 3) * innerHeight * (rBottom ** 2 + rBottom * rTop + rTop ** 2)
  return volume / 1000
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'caneca'
}
