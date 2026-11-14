import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PRODUCT_TYPE = 'termoformador' as const

/** Linha mínima da malha: uma extrusão de 0,4 mm (bico padrão). */
export const MINIMUM_LINE_MM = 0.4
export const MAX_SCREEN_OPENINGS = 4000
export const SCREEN_SEGMENTS = 128

export const thermoformerParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  diameter: z.number().min(60).max(300),
  thickness: z.number().min(1.2).max(6),
  frameWidth: z.number().min(2).max(30),
  lineWidth: z.number().min(0.4).max(4),
  opening: z.number().min(3).max(30),
  color: z.enum(PLA_COLORS),
})

export type ThermoformerParams = z.infer<typeof thermoformerParamsSchema>

/** Campos que alteram geometria. A cor fica de fora para não rebuildar. */
export type ThermoformerGeometryParams = Omit<ThermoformerParams, 'color'>

export const defaultThermoformerParams: ThermoformerParams = {
  productType: PRODUCT_TYPE,
  diameter: 160,
  thickness: 3,
  frameWidth: 6,
  lineWidth: 0.4,
  opening: 6,
  color: '#14b8a6',
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'termoformador'
}
