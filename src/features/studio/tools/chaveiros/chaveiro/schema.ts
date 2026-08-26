import { z } from 'zod'

export const TEXT_BORDER_MIN = 4
export const RING_EDGE_MARGIN = 2

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const textItemSchema = z.object({
  id: z.string().min(1),
  content: z.string().trim().min(1).max(12),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  width: z.number().min(8).max(60),
  height: z.number().min(4).max(20),
  relief: z.number().min(0.4).max(2),
  proportional: z.boolean(),
  offsetX: z.number().min(-20).max(20),
  offsetY: z.number().min(-20).max(20),
})

export type TextItem = z.infer<typeof textItemSchema>

export const keychainParamsSchema = z.object({
  productType: z.literal('keychain'),
  textMode: z.enum(['raised', 'engraved']),
  baseShape: z.enum(['rect', 'circle', 'heart']),
  width: z.number().min(20).max(80),
  borderWidth: z.number().min(4).max(10),
  thickness: z.number().min(2).max(6),
  ringPosition: z.enum(['top', 'bottom', 'left', 'right']),
  ringInnerDiameter: z.number().min(3).max(10),
  ringEmbedding: z.number().min(0).max(3),
  ringLateralOffset: z.number().min(-10).max(10),
  ringRadialOffset: z.number().min(0).max(5),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  texts: z.array(textItemSchema).min(1).max(3),
})

export type KeychainParams = z.infer<typeof keychainParamsSchema>
export type KeychainShape = KeychainParams['baseShape']
export type KeychainTextMode = KeychainParams['textMode']
export type FontStyle = TextItem['fontStyle']
export type RingPosition = KeychainParams['ringPosition']

const defaultText: TextItem = {
  id: 'text-1',
  content: 'Meu nome',
  fontStyle: 'bold',
  width: 40,
  height: 10,
  relief: 1,
  proportional: false,
  offsetX: 0,
  offsetY: 0,
}

export const defaultKeychainParams: KeychainParams = {
  productType: 'keychain',
  textMode: 'raised',
  baseShape: 'rect',
  width: 50,
  borderWidth: 4,
  thickness: 3,
  ringPosition: 'top',
  ringInnerDiameter: 5,
  ringEmbedding: 0,
  ringLateralOffset: 0,
  ringRadialOffset: 0,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  texts: [defaultText],
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
