import { z } from 'zod'

export const CONTENT_DEPTH = 1
export const CONTENT_MARGIN = 3
export const SLOT_GAP = 2
export const PLATE_REAR_MIN = 2

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PHOTO_SIZES = {
  '10x15': { width: 100, height: 150 },
  '13x18': { width: 130, height: 180 },
  '15x20': { width: 150, height: 200 },
} as const

export type PhotoSizeKey = keyof typeof PHOTO_SIZES

export const PHOTO_SIZE_KEYS = ['10x15', '13x18', '15x20'] as [
  PhotoSizeKey,
  ...PhotoSizeKey[],
]

const contentFields = {
  id: z.string().min(1),
  offsetX: z.number().min(-95).max(95),
  offsetY: z.number().min(-25).max(25),
}

export const textContentSchema = z.object({
  ...contentFields,
  kind: z.literal('text'),
  content: z.string(),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(3).max(15),
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
export type PhotoStandContent = z.infer<typeof contentItemSchema>
export type FontStyle = TextContent['fontStyle']

export const photoStandParamsSchema = z.object({
  productType: z.literal('photo-stand'),
  photoSize: z.enum(PHOTO_SIZE_KEYS),
  sideMargin: z.number().min(3).max(20),
  bandHeight: z.number().min(15).max(40),
  depth: z.number().min(30).max(60),
  thickness: z.number().min(2).max(4),
  angle: z.number().min(60).max(85),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  contents: z.array(contentItemSchema).min(1).max(3),
})

export type PhotoStandParams = z.infer<typeof photoStandParamsSchema>

export const defaultPhotoStandParams: PhotoStandParams = {
  productType: 'photo-stand',
  photoSize: '10x15',
  sideMargin: 10,
  bandHeight: 25,
  depth: 40,
  thickness: 3,
  angle: 75,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  contents: [
    {
      id: 'content-1',
      kind: 'text',
      content: 'Família',
      fontStyle: 'bold',
      fontSize: 10,
      offsetX: 0,
      offsetY: 0,
    },
  ],
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
  return cleaned.length > 0 ? cleaned : 'suporte-foto'
}
