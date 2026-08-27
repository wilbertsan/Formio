import { z } from 'zod'

// Cores PLA disponíveis (reutilizando do cartao-visita)
export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

// Mapeamento de alturas predefinidas (em mm)
export const HEIGHT_MAP = {
  low: 40,
  medium: 60,
  high: 80,
} as const

export type Height = keyof typeof HEIGHT_MAP

// Dimensões da coluna cônica
export const COLUMN_TOP_RADIUS = 20    // mm
export const COLUMN_BOTTOM_RADIUS = 30 // mm

// Schema do suporte de bolo
export const cakeStandParamsSchema = z.object({
  productType: z.literal('cake-stand'),
  baseDiameter: z.number().min(80).max(200),
  height: z.enum(['low', 'medium', 'high']),
  thickness: z.number().min(3).max(6),
  plateHasRim: z.boolean(),
  rimHeight: z.number().min(5).max(15),
  baseDecoration: z.enum(['none', 'hexagon', 'lines', 'waves']),
  baseColor: z.enum(PLA_COLORS),
})

export type CakeStandParams = z.infer<typeof cakeStandParamsSchema>
export type BaseDecoration = CakeStandParams['baseDecoration']

// Valores padrão
export const defaultCakeStandParams: CakeStandParams = {
  productType: 'cake-stand',
  baseDiameter: 150,
  height: 'medium',
  thickness: 4,
  plateHasRim: true,
  rimHeight: 8,
  baseDecoration: 'hexagon',
  baseColor: '#14b8a6',
}