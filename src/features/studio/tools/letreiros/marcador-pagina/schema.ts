import { z } from 'zod'

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

export const bookmarkParamsSchema = z.object({
  productType: z.literal('bookmark'),
  length: z.number().min(50).max(150),
  width: z.number().min(30).max(50),
  thickness: z.literal(2),
  holeDiameter: z.number().min(3).max(8),
  holeMargin: z.number().min(5).max(15),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  textMode: z.enum(['raised', 'engraved']),
  texts: z.array(textItemSchema).min(1).max(3),
})

export type BookmarkParams = z.infer<typeof bookmarkParamsSchema>
export type BookmarkTextMode = BookmarkParams['textMode']
export type FontStyle = TextItem['fontStyle']

export const defaultText: TextItem = {
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

export const defaultBookmarkParams: BookmarkParams = {
  productType: 'bookmark',
  length: 120,
  width: 40,
  thickness: 2,
  holeDiameter: 5,
  holeMargin: 10,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  textMode: 'raised',
  texts: [defaultText],
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'marcador'
}
