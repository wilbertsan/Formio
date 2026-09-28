import { z } from 'zod'

// Cores PLA disponíveis (reutilizando do topo-bolo)
export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

// Constantes fixas
export const MIN_GAP_BETWEEN_WALL_AND_STAMP = 3

// Schema do cortador + carimbo
export const cutterStampParamsSchema = z.object({
  productType: z.literal('cutter-stamp'),
  outerShape: z.enum(['circle', 'rectangle', 'star']),
  diameter: z.number().min(30).max(80),
  rectWidth: z.number().min(30).max(80),
  rectHeight: z.number().min(30).max(80),
  wallHeight: z.number().min(15).max(40),
  wallThickness: z.number().min(0.8).max(2),
  stampHeight: z.number().min(5).max(20),
  text: z.string().max(30),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(5).max(15),
  centralShape: z.enum(['circle', 'star', 'heart']).nullable(),
  shapeScale: z.number().min(0.5).max(2.0),
  baseColor: z.enum(PLA_COLORS),
  stampColor: z.enum(PLA_COLORS),
}).refine(
  (data) => data.stampHeight < data.wallHeight,
  { message: 'Altura do carimbo deve ser menor que a altura da parede', path: ['stampHeight'] },
).refine(
  (data) => data.text.length > 0 || data.centralShape !== null,
  { message: 'Forneça um texto ou selecione uma forma central', path: ['text'] },
)

export type CutterStampParams = z.infer<typeof cutterStampParamsSchema>
export type OuterShape = CutterStampParams['outerShape']
export type CentralShape = NonNullable<CutterStampParams['centralShape']>

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'cortador-carimbo'
}

// Valores padrão
export const defaultCutterStampParams: CutterStampParams = {
  productType: 'cutter-stamp',
  outerShape: 'circle',
  diameter: 50,
  rectWidth: 60,
  rectHeight: 45,
  wallHeight: 25,
  wallThickness: 1.2,
  stampHeight: 10,
  text: 'Parabéns',
  fontStyle: 'bold',
  fontSize: 10,
  centralShape: null,
  shapeScale: 1.0,
  baseColor: '#14b8a6',
  stampColor: '#f5f5f5',
}
