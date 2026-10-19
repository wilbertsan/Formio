import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const
export type PlaColor = (typeof PLA_COLORS)[number]

export const PRODUCT_TYPE = 'texture-roller' as const

export const HANDLE_DIAMETER_MM = 8
export const HANDLE_LENGTH_MM = 25
export const HANDLE_FILLET_MM = 2
export const MESH_STEP_MM = 0.5
export const RELIEF_BEVEL_MM = 0.4
export const MIN_FEATURE_MM = 0.8
export const EDGE_MARGIN_MM = 1

export const PATTERN_FAMILIES = ['geometric', 'wave', 'floral'] as const
export type PatternFamily = (typeof PATTERN_FAMILIES)[number]

export const MOTIFS_BY_FAMILY = {
  geometric: ['diamonds', 'dots', 'grid'],
  wave: ['waves', 'chevrons', 'scales'],
  floral: ['flower', 'leaf', 'rosette'],
} as const satisfies Record<PatternFamily, readonly string[]>

export type PatternMotif = (typeof MOTIFS_BY_FAMILY)[PatternFamily][number]

export const DENSITIES = ['low', 'medium', 'high'] as const
export type Density = (typeof DENSITIES)[number]
export const DENSITY_CELL_MM: Record<Density, number> = { low: 12, medium: 8, high: 5 }

export const PATTERN_SOURCES = ['motif', 'svg'] as const
export type PatternSource = (typeof PATTERN_SOURCES)[number]

export function defaultMotifForFamily(family: PatternFamily): PatternMotif {
  return MOTIFS_BY_FAMILY[family][0]
}

export const textureRollerParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  length: z.number().min(50).max(150),
  diameter: z.number().min(20).max(40),
  patternFamily: z.enum(PATTERN_FAMILIES),
  patternMotif: z.string(),
  patternSource: z.enum(PATTERN_SOURCES),
  svgIcon: z.string().nullable(),
  reliefDepth: z.number().min(0.5).max(2),
  density: z.enum(DENSITIES),
  rollerColor: z.enum(PLA_COLORS),
  reliefColor: z.enum(PLA_COLORS),
}).refine(
  (d) => (MOTIFS_BY_FAMILY[d.patternFamily] as readonly string[]).includes(d.patternMotif),
  { message: 'Motivo inválido para a família', path: ['patternMotif'] },
).refine(
  (d) => d.patternSource !== 'svg' || d.svgIcon !== null,
  { message: 'Envie um SVG', path: ['svgIcon'] },
)

export type TextureRollerParams = z.infer<typeof textureRollerParamsSchema>

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'rolo-textura'
}

export const defaultTextureRollerParams: TextureRollerParams = {
  productType: PRODUCT_TYPE,
  length: 100,
  diameter: 30,
  patternFamily: 'geometric',
  patternMotif: defaultMotifForFamily('geometric'),
  patternSource: 'motif',
  svgIcon: null,
  reliefDepth: 1,
  density: 'medium',
  rollerColor: '#22c55e',
  reliefColor: '#f5f5f5',
}
