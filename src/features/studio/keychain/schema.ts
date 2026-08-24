import { z } from 'zod'

export const TEXT_BORDER_MIN = 4
export const RING_EDGE_MARGIN = 2

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const keychainParamsSchema = z.object({
  productType: z.literal('keychain'),
  name: z.string().trim().min(1).max(12),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  baseShape: z.enum(['rect', 'circle', 'heart']),
  textMode: z.enum(['raised', 'engraved']),
  width: z.number().min(20).max(80),
  borderWidth: z.number().min(4).max(10),
  thickness: z.number().min(2).max(6),
  letterHeight: z.number().min(0.4).max(2),
  textWidth: z.number().min(8).max(60),
  textSize: z.number().min(4).max(20),
  ringPosition: z.enum(['top', 'bottom', 'left', 'right']),
  ringInnerDiameter: z.number().min(3).max(10),
  ringThickness: z.number().min(1.5).max(4),
  ringEmbedding: z.number().min(0).max(3),
  ringLateralOffset: z.number().min(-10).max(10),
  ringRadialOffset: z.number().min(0).max(5),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
})

export type KeychainParams = z.infer<typeof keychainParamsSchema>
export type KeychainShape = KeychainParams['baseShape']
export type KeychainTextMode = KeychainParams['textMode']
export type FontStyle = KeychainParams['fontStyle']
export type RingPosition = KeychainParams['ringPosition']

export const defaultKeychainParams: KeychainParams = {
  productType: 'keychain',
  name: 'Meu nome',
  fontStyle: 'bold',
  baseShape: 'rect',
  textMode: 'raised',
  width: 50,
  borderWidth: 4,
  thickness: 3,
  letterHeight: 1,
  textWidth: 40,
  textSize: 10,
  ringPosition: 'top',
  ringInnerDiameter: 5,
  ringThickness: 2,
  ringEmbedding: 0,
  ringLateralOffset: 0,
  ringRadialOffset: 0,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/gi, 'c')
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'chaveiro'
}
