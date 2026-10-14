import { z } from 'zod'

// Cores PLA disponíveis
export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

// Constantes fixas
// Folga por lado entre a abertura do cortador e a silhueta do carimbo (mm)
export const CLEARANCE_MM = 0.4
// Proporção da altura total do carimbo reservada ao cabo
export const HANDLE_HEIGHT_RATIO = 0.6
// Espaço entre as duas peças no leito de impressão (mm)
export const PIECE_GAP_MM = 10

// Largura máxima da forma (mm) — mesa de impressão típica ~220mm
export const MAX_SHAPE_WIDTH_MM = 150
// Raio do cabo como fração da altura da forma
export const HANDLE_RADIUS_RATIO = 0.35

// Tipo de forma (mutuamente exclusivo)
export const CONTENT_TYPES = ['text', 'svg'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export const cutterStampParamsSchema = z.object({
  productType: z.literal('cutter-stamp'),
  contentType: z.enum(CONTENT_TYPES),
  text: z.string().trim().max(30),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  textHeight: z.number().min(10).max(60),
  svgIcon: z.string().nullable(),
  iconScale: z.number().min(0.5).max(1.0),
  iconLineWidth: z.number().min(0.1).max(1.5),
  wallHeight: z.number().min(15).max(40),
  wallThickness: z.number().min(0.8).max(2),
  stampHeight: z.number().min(15).max(25),
  baseMargin: z.number().min(2).max(10),
  reliefHeight: z.number().min(1).max(3),
  cutterColor: z.enum(PLA_COLORS),
  stampColor: z.enum(PLA_COLORS),
}).refine(
  (data) => data.contentType !== 'text' || data.text.trim().length > 0,
  { message: 'Informe um texto', path: ['text'] },
).refine(
  (data) => data.contentType !== 'svg' || data.svgIcon !== null,
  { message: 'Envie um ícone SVG', path: ['svgIcon'] },
)

export type CutterStampParams = z.infer<typeof cutterStampParamsSchema>

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'cortador-carimbo'
}

export const defaultCutterStampParams: CutterStampParams = {
  productType: 'cutter-stamp',
  contentType: 'text',
  text: 'Parabéns',
  fontStyle: 'bold',
  textHeight: 25,
  svgIcon: null,
  iconScale: 1.0,
  iconLineWidth: 0.3,
  wallHeight: 25,
  wallThickness: 1.2,
  stampHeight: 20,
  baseMargin: 4,
  reliefHeight: 2,
  cutterColor: '#14b8a6',
  stampColor: '#f5f5f5',
}
