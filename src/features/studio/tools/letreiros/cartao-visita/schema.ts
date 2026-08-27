import { z } from 'zod'

export const MARGIN_MIN = 3

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const textBlockSchema = z.object({
  id: z.string().min(1),
  content: z.string().trim().min(1).max(30),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(3).max(12),
  relief: z.number().min(0.3).max(1.5),
  offsetX: z.number().min(-30).max(30),
  offsetY: z.number().min(-30).max(30),
})

export type TextBlock = z.infer<typeof textBlockSchema>

export const cardParamsSchema = z.object({
  productType: z.literal('card'),
  layout: z.enum(['centered', 'left']),
  width: z.number().min(50).max(90),
  height: z.number().min(30).max(60),
  thickness: z.number().min(1).max(3),
  cornerRadius: z.number().min(0).max(10),
  textMode: z.enum(['raised', 'engraved']),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  blocks: z.array(textBlockSchema).min(1).max(3),
})

export type CardParams = z.infer<typeof cardParamsSchema>
export type CardLayout = CardParams['layout']
export type CardTextMode = CardParams['textMode']
export type FontStyle = TextBlock['fontStyle']

const defaultBlocks: TextBlock[] = [
  {
    id: 'block-1',
    content: 'Nome',
    fontStyle: 'bold',
    fontSize: 8,
    relief: 1,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: 'block-2',
    content: 'Cargo',
    fontStyle: 'normal',
    fontSize: 5,
    relief: 0.8,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: 'block-3',
    content: 'contato@email.com',
    fontStyle: 'normal',
    fontSize: 4,
    relief: 0.6,
    offsetX: 0,
    offsetY: 0,
  },
]

export const defaultCardParams: CardParams = {
  productType: 'card',
  layout: 'centered',
  width: 85,
  height: 55,
  thickness: 2,
  cornerRadius: 3,
  textMode: 'raised',
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  blocks: defaultBlocks,
}
