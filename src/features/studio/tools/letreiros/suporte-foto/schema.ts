import { z } from 'zod'

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

/** Default angle (degrees) for the photo slot tilt */
export const SLOT_ANGLE = 75
/** Default width (mm) for the photo slot groove */
export const SLOT_WIDTH = 2
/** Default depth (mm) for the photo slot groove */
export const SLOT_DEPTH = 10

export const photoStandParamsSchema = z.object({
  productType: z.literal('photo-stand'),
  text: z.string().trim().min(1).max(30),
  photoSize: z.enum(Object.keys(PHOTO_SIZES) as [string, ...string[]]),
  baseHeight: z.number().min(50).max(120),
  baseThickness: z.number().min(2).max(4),
  baseMinWidth: z.number().min(40).max(100),
  baseDepth: z.number().min(30).max(60),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
})

export type PhotoStandParams = z.infer<typeof photoStandParamsSchema>
export type FontStyle = PhotoStandParams['fontStyle']

export const defaultPhotoStandParams = {
  productType: 'photo-stand' as const,
  text: 'Meu Nome',
  photoSize: '10x15',
  baseHeight: 80,
  baseThickness: 3,
  baseMinWidth: 60,
  baseDepth: 40,
  fontStyle: 'bold' as const,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
} satisfies PhotoStandParams
