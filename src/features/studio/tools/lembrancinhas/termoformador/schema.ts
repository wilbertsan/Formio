import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PRODUCT_TYPE = 'termoformador' as const

/** Linha mínima da malha: uma extrusão de 0,4 mm (bico padrão). */
export const MINIMUM_LINE_MM = 0.4
/** Menor espessura estrutural confiável do suporte. */
export const MINIMUM_SUPPORT_MM = 0.8
export const MAX_SCREEN_OPENINGS = 4000
export const SCREEN_SEGMENTS = 128
export const PLUG_CHAMFER_MM = 0.8
/** Material mínimo entre o ápice da pega e o polo do domo. */
export const PLUG_GRIP_MIN_MATERIAL_MM = 6
export const PLUG_DOME_SEGMENTS = 32
export const PLUG_PREVIEW_GAP_MM = 8

export const THERMOFORMER_SHAPES = [
  'circle',
  'square',
  'rectangle',
  'pyramid',
  'svg',
] as const

export type ThermoformerShape = (typeof THERMOFORMER_SHAPES)[number]

export const MINIMUM_SHAPE_MM = 40
export const MAXIMUM_SHAPE_MM = 300
export const MINIMUM_SVG_SIZE_MM = 40
export const MAXIMUM_SVG_SIZE_MM = 300
export const MINIMUM_TRAY_BOTTOM_SCALE = 0.05
export const MINIMUM_PYRAMID_TIP = 0.05
export const MAXIMUM_PYRAMID_TIP = 0.3
export const MINIMUM_PYRAMID_TIP_MM = 3
export const MINIMUM_DRAFT_ANGLE = 0
export const MAXIMUM_DRAFT_ANGLE = 15
export const MINIMUM_DRAFT_ANGLE_DEG = 2
export const SVG_MAX_LENGTH = 2_000_000
export const PLUG_GRIP_MAX_MM = 30
export const PLUG_GRIP_SEGMENTS = 64
/** O cone sobe acima do topo para o CSG não cortar faces coplanares. */
export const PLUG_GRIP_OVERLAP_MM = 0.1
/**
 * O ápice do `ConeGeometry` é uma coroa degenerada que deixa um triângulo
 * aberto no CSG quando a base passa do topo. Um frustum com ponta de 0,01 mm
 * mantém a mesma parede e fecha a malha.
 */
export const PLUG_GRIP_TIP_RADIUS_MM = 0.01
/** Abaixo disso a pega vira um furo frágil; o macho sai com topo plano. */
export const MINIMUM_GRIP_RADIUS_MM = 0.5

export const thermoformerParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  shape: z.enum(THERMOFORMER_SHAPES),
  diameter: z.number().min(60).max(300),
  width: z.number().min(MINIMUM_SHAPE_MM).max(MAXIMUM_SHAPE_MM),
  height: z.number().min(MINIMUM_SHAPE_MM).max(MAXIMUM_SHAPE_MM),
  svgSize: z.number().min(MINIMUM_SVG_SIZE_MM).max(MAXIMUM_SVG_SIZE_MM),
  draftAngle: z.number().min(MINIMUM_DRAFT_ANGLE).max(MAXIMUM_DRAFT_ANGLE),
  pyramidTip: z.number().min(MINIMUM_PYRAMID_TIP).max(MAXIMUM_PYRAMID_TIP),
  svg: z.string().max(SVG_MAX_LENGTH),
  thickness: z.number().min(1.2).max(6),
  frameWidth: z.number().min(2).max(30),
  lineWidth: z.number().min(0.4).max(4),
  opening: z.number().min(3).max(30),
  wallThickness: z.number().min(2).max(10),
  bottomThickness: z.number().min(2).max(10),
  bowlDepth: z.number().min(5).max(60),
  stepWidth: z.number().min(2).max(15),
  fitClearance: z.number().min(0.1).max(0.6),
  edgeChamfer: z.number().min(0).max(3),
  plugHeight: z.number().min(10).max(40),
  color: z.enum(PLA_COLORS),
})

export type ThermoformerParams = z.infer<typeof thermoformerParamsSchema>

/** Campos que alteram geometria. A cor fica de fora para não rebuildar. */
export type ThermoformerGeometryParams = Omit<ThermoformerParams, 'color'>

export const defaultThermoformerParams: ThermoformerParams = {
  productType: PRODUCT_TYPE,
  shape: 'circle',
  diameter: 160,
  width: 160,
  height: 100,
  svgSize: 160,
  draftAngle: 5,
  pyramidTip: 0.1,
  svg: '',
  thickness: 3,
  frameWidth: 6,
  lineWidth: 0.4,
  opening: 6,
  wallThickness: 4,
  bottomThickness: 4,
  bowlDepth: 20,
  stepWidth: 5,
  fitClearance: 0.3,
  edgeChamfer: 0.6,
  plugHeight: 26,
  color: '#14b8a6',
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'termoformador'
}
