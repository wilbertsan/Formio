import { z } from 'zod'

export const CONTENT_DEPTH = 1
export const CONTENT_MARGIN = 3
export const BASE_BEVEL = 0.1

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

const contentFields = {
  id: z.string().min(1),
  offsetX: z.number().min(-40).max(40),
  offsetY: z.number().min(-40).max(40),
}

export const textContentSchema = z.object({
  ...contentFields,
  kind: z.literal('text'),
  content: z.string(),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(3).max(12),
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
export type CardContent = z.infer<typeof contentItemSchema>
export type FontStyle = TextContent['fontStyle']

export const cardParamsSchema = z.object({
  productType: z.literal('card'),
  width: z.number().min(50).max(90),
  height: z.number().min(30).max(60),
  thickness: z.number().min(1).max(3),
  cornerRadius: z.number().min(0).max(10),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  contents: z.array(contentItemSchema).min(1).max(3),
})

export type CardParams = z.infer<typeof cardParamsSchema>

const defaultContents: CardContent[] = [
  {
    id: 'content-1',
    kind: 'text',
    content: 'Seu Nome',
    fontStyle: 'bold',
    fontSize: 7,
    offsetX: 0,
    offsetY: 10,
  },
  {
    id: 'content-2',
    kind: 'text',
    content: 'Seu Cargo',
    fontStyle: 'normal',
    fontSize: 4,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: 'content-3',
    kind: 'text',
    content: 'seu@email.com',
    fontStyle: 'normal',
    fontSize: 3,
    offsetX: 0,
    offsetY: -10,
  },
]

export const defaultCardParams: CardParams = {
  productType: 'card',
  width: 85,
  height: 55,
  thickness: 2,
  cornerRadius: 3,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  contents: defaultContents,
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/gi, 'c')
}

export function sanitizeFilename(name: string): string {
  const normalized = normalizeName(name)
  const cleaned = normalized.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'cartao-visita'
}
