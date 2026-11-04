import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const textSchema = z.object({
  content: z.string().trim().min(1),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  width: z.number().min(8).max(100),
  height: z.number().min(4).max(40),
  relief: z.number().min(3).max(5),
})

export type TextParams = z.infer<typeof textSchema>

export const PATTERN_TYPES = [
  'none', 'triangles', 'squares', 'circles', 'diamonds', 'svg',
] as const
export type PatternType = (typeof PATTERN_TYPES)[number]

export const PATTERN_DENSITIES = ['low', 'medium', 'high'] as const
export type PatternDensity = (typeof PATTERN_DENSITIES)[number]
export const PATTERN_CELL_MM: Record<PatternDensity, number> = {
  low: 12,
  medium: 8,
  high: 5,
}

export const patternSchema = z.object({
  type: z.enum(PATTERN_TYPES),
  density: z.enum(PATTERN_DENSITIES),
  depth: z.number().min(0.4).max(1.5),
  svg: z.string().nullable(),
})

export type PatternParams = z.infer<typeof patternSchema>

export const bookmarkParamsSchema = z.object({
  productType: z.literal('bookmark'),
  length: z.number().min(50).max(150),
  width: z.number().min(30).max(50),
  thickness: z.number().min(1).max(2),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  text: textSchema,
  pattern: patternSchema,
})

export type BookmarkParams = z.infer<typeof bookmarkParamsSchema>
export type FontStyle = TextParams['fontStyle']

export const defaultBookmarkParams: BookmarkParams = {
  productType: 'bookmark',
  length: 100,
  width: 50,
  thickness: 1,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  text: {
    content: 'Meu nome',
    fontStyle: 'bold',
    width: 40,
    height: 10,
    relief: 3,
  },
  pattern: {
    type: 'none',
    density: 'medium',
    depth: 0.8,
    svg: null,
  },
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'marcador'
}
