import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const textItemSchema = z.object({
  id: z.string().min(1),
  content: z.string().trim().min(1).max(30),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  width: z.number().min(20).max(200),
  height: z.number().min(5).max(40),
  relief: z.number().min(0.4).max(3),
  proportional: z.boolean(),
  offsetX: z.number().min(-50).max(50),
  offsetY: z.number().min(-30).max(30),
})

export type TextItem = z.infer<typeof textItemSchema>

export const placaLojaParamsSchema = z.object({
  productType: z.literal('placa-loja'),
  width: z.number().min(100).max(300),
  height: z.number().min(50).max(150),
  thickness: z.number().min(3).max(8),
  shape: z.enum(['rectangular', 'rounded']),
  cornerRadius: z.number().min(5).max(20),
  screwHoleDiameter: z.number().min(4).max(6),
  screwHoleMargin: z.number().min(5).max(15),
  textMode: z.enum(['raised', 'engraved']),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  texts: z.array(textItemSchema).min(1).max(5),
})

export type PlacaLojaParams = z.infer<typeof placaLojaParamsSchema>
export type PlacaLojaTextMode = PlacaLojaParams['textMode']
export type Shape = PlacaLojaParams['shape']

export const defaultText: TextItem = {
  id: 'text-1',
  content: 'Minha Loja',
  fontStyle: 'bold',
  width: 150,
  height: 30,
  relief: 1.5,
  proportional: false,
  offsetX: 0,
  offsetY: 0,
}

export const defaultPlacaLojaParams: PlacaLojaParams = {
  productType: 'placa-loja',
  width: 200,
  height: 100,
  thickness: 5,
  shape: 'rectangular',
  cornerRadius: 10,
  screwHoleDiameter: 5,
  screwHoleMargin: 10,
  textMode: 'raised',
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  texts: [defaultText],
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'placa'
}
