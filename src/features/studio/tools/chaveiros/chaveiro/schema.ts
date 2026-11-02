import { z } from 'zod'

export const TEXT_BORDER_MIN = 4
export const RING_EDGE_MARGIN = 2
export const CONTENT_DEPTH = 1

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

const contentFields = {
  id: z.string().min(1),
  offsetX: z.number().min(-20).max(20),
  offsetY: z.number().min(-20).max(20),
}

export const textContentSchema = z.object({
  ...contentFields,
  kind: z.literal('text'),
  content: z.string().trim().max(12),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(6).max(15),
})

export const iconContentSchema = z.object({
  ...contentFields,
  kind: z.literal('icon'),
  svgIcon: z.string().min(1).nullable(),
  iconScale: z.number().min(0.5).max(1),
  iconLineWidth: z.number().min(0.1).max(1.5),
})

export const contentItemSchema = z.discriminatedUnion('kind', [
  textContentSchema,
  iconContentSchema,
])

export type TextContent = z.infer<typeof textContentSchema>
export type IconContent = z.infer<typeof iconContentSchema>
export type ContentItem = z.infer<typeof contentItemSchema>
export type FontStyle = TextContent['fontStyle']

export const keychainParamsSchema = z.object({
  productType: z.literal('keychain'),
  baseShape: z.enum(['rect', 'circle', 'heart', 'name']),
  width: z.number().min(20).max(80),
  height: z.number().min(20).max(80),
  borderWidth: z.number().min(4).max(10),
  thickness: z.number().min(2).max(6),
  ringPosition: z.enum(['top', 'bottom', 'left', 'right']),
  ringInnerDiameter: z.number().min(3).max(10),
  ringEmbedding: z.number().min(0).max(3),
  ringLateralOffset: z.number().min(-10).max(10),
  ringRadialOffset: z.number().min(0).max(5),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  contents: z.array(contentItemSchema).min(1).max(3),
})

export type KeychainParams = z.infer<typeof keychainParamsSchema>
export type KeychainShape = KeychainParams['baseShape']
export type RingPosition = KeychainParams['ringPosition']

const defaultContent: TextContent = {
  id: 'content-1',
  kind: 'text',
  content: 'Meu nome',
  fontStyle: 'bold',
  fontSize: 10,
  offsetX: 0,
  offsetY: 0,
}

export const defaultKeychainParams: KeychainParams = {
  productType: 'keychain',
  baseShape: 'rect',
  width: 50,
  height: 25,
  borderWidth: 4,
  thickness: 3,
  ringPosition: 'top',
  ringInnerDiameter: 5,
  ringEmbedding: 0,
  ringLateralOffset: 0,
  ringRadialOffset: 0,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  contents: [defaultContent],
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
