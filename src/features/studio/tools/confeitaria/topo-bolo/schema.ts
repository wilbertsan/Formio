import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const
export type PlaColor = (typeof PLA_COLORS)[number]

export const textItemSchema = z.object({
  id: z.string().min(1),
  content: z.string().trim().min(1).max(40),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  width: z.number().min(10).max(110),
  height: z.number().min(5).max(50),
  relief: z.number().min(0.4).max(3),
  proportional: z.boolean(),
  offsetX: z.number().min(-55).max(55),
  offsetY: z.number().min(-35).max(35),
})
export type TextItem = z.infer<typeof textItemSchema>

export const cakeTopperParamsSchema = z.object({
  productType: z.literal('cake-topper'),
  shape: z.enum(['circle', 'rounded-rect', 'oval', 'custom']),
  width: z.number().min(50).max(120),
  height: z.number().min(30).max(80),
  thickness: z.number().min(2).max(4),
  cornerRadius: z.number().min(3).max(15),
  contourSvg: z.string().nullable(),
  svgIcon: z.string().nullable(),
  iconPosition: z.enum(['above', 'center']),
  iconScale: z.number().min(0.5).max(2),
  textMode: z.enum(['raised', 'cut']),
  supportType: z.enum(['haste', 'base']),
  stemDiameter: z.number().min(3).max(8),
  stemLength: z.number().min(20).max(60),
  slotWidth: z.number().min(2.4).max(4.5),
  slotDepth: z.number().min(5).max(20),
  baseWidth: z.number().min(30).max(60),
  baseDepth: z.number().min(20).max(40),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  texts: z.array(textItemSchema).min(1).max(3),
})
export type CakeTopperParams = z.infer<typeof cakeTopperParamsSchema>
export type Shape = CakeTopperParams['shape']
export type TextMode = CakeTopperParams['textMode']
export type SupportType = CakeTopperParams['supportType']
export type FontStyle = TextItem['fontStyle']

export const defaultText: TextItem = {
  id: 'text-1', content: 'Feliz Aniversário', fontStyle: 'bold',
  width: 90, height: 14, relief: 1, proportional: false, offsetX: 0, offsetY: 0,
}

export const defaultCakeTopperParams: CakeTopperParams = {
  productType: 'cake-topper', shape: 'circle', width: 80, height: 50, thickness: 3,
  cornerRadius: 6, contourSvg: null, svgIcon: null, iconPosition: 'above', iconScale: 1,
  textMode: 'raised', supportType: 'haste', stemDiameter: 4, stemLength: 40,
  slotWidth: 3.4, slotDepth: 10, baseWidth: 50, baseDepth: 30,
  baseColor: '#14b8a6', letterColor: '#f5f5f5', texts: [defaultText],
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'topo-bolo'
}
