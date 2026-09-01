import { z } from 'zod'

// Cores PLA disponíveis (reutilizando do topo-bolo)
export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

// Constantes fixas
export const RELIEF_DEPTH = 1
export const HANDLE_HEIGHT_RATIO = 0.6

// Schema do carimbo
export const stampParamsSchema = z.object({
  productType: z.literal('stamp'),
  text: z.string().min(1).max(30),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(6).max(15),
  diameter: z.number().min(10).max(30),
  height: z.number().min(15).max(25),
  reliefType: z.enum(['negative', 'positive']),
  svgIcon: z.string().nullable(),
  iconScale: z.number().min(0.5).max(2.0),
  baseColor: z.enum(PLA_COLORS),
  reliefColor: z.enum(PLA_COLORS),
})

export type StampParams = z.infer<typeof stampParamsSchema>
export type ReliefType = StampParams['reliefType']

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'carimbo'
}

// Valores padrão
export const defaultStampParams: StampParams = {
  productType: 'stamp',
  text: 'Parabéns',
  fontStyle: 'bold',
  fontSize: 10,
  diameter: 20,
  height: 20,
  reliefType: 'negative',
  svgIcon: null,
  iconScale: 1.0,
  baseColor: '#14b8a6',
  reliefColor: '#f5f5f5',
}
