import { z } from 'zod'

// Cores PLA disponíveis (reutilizando do cartao-visita)
export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

// Constantes fixas
export const LEG_DEPTH = 3
export const LEG_BOTTOM_WIDTH = 8
export const BORDER_RADIUS = 3

// Schema do topo de bolo
export const cakeTopperParamsSchema = z.object({
  productType: z.literal('cake-topper'),
  text: z.string().min(1).max(40),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(8).max(20),
  shape: z.enum(['circle', 'rectangle', 'oval']),
  width: z.number().min(50).max(120),
  height: z.number().min(30).max(80),
  thickness: z.number().min(2).max(4),
  svgIcon: z.string().nullable(),
  iconPosition: z.enum(['above', 'left', 'right']),
  iconScale: z.number().min(0.5).max(2.0),
  legHeight: z.number().min(30).max(60),
  legWidth: z.number().min(3).max(8),
  baseColor: z.enum(PLA_COLORS),
  textColor: z.enum(PLA_COLORS),
})

export type CakeTopperParams = z.infer<typeof cakeTopperParamsSchema>
export type Shape = CakeTopperParams['shape']
export type IconPosition = CakeTopperParams['iconPosition']

// Valores padrão
export const defaultCakeTopperParams: CakeTopperParams = {
  productType: 'cake-topper',
  text: 'Feliz Aniversário',
  fontStyle: 'bold',
  fontSize: 12,
  shape: 'circle',
  width: 80,
  height: 50,
  thickness: 3,
  svgIcon: null,
  iconPosition: 'above',
  iconScale: 1.0,
  legHeight: 40,
  legWidth: 5,
  baseColor: '#14b8a6',
  textColor: '#f5f5f5',
}
