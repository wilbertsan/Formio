import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PRODUCT_TYPE = 'termoformador' as const

export const FIT_TYPES = ['external', 'internal'] as const
export const SURFACE_CURVATURES = ['flat', 'slightly_convex', 'slightly_concave'] as const
export const PANEL_PATTERNS = ['perforated', 'grid', 'mesh'] as const
export const HANDLE_SIDES = ['left', 'right', 'top', 'bottom'] as const

export const MINIMUM_WALL_MM = 0.8
export const MINIMUM_FEATURE_MM = 0.8
export const MAX_PANEL_OPENINGS = 800
export const PANEL_CURVATURE_MM = 1.5
export const SHELL_SEGMENTS = 128

export type FitType = (typeof FIT_TYPES)[number]
export type SurfaceCurvature = (typeof SURFACE_CURVATURES)[number]
export type PanelPattern = (typeof PANEL_PATTERNS)[number]
export type HandleSide = (typeof HANDLE_SIDES)[number]

export const thermoformerParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  width: z.number().min(60).max(300),
  depth: z.number().min(60).max(300),
  height: z.number().min(20).max(120),
  cornerRadius: z.number().min(0).max(40),
  wallThickness: z.number().min(1.2).max(6),
  bottomThickness: z.number().min(1.2).max(6),
  rimHeight: z.number().min(0).max(10),
  rimThickness: z.number().min(1.2).max(6),
  edgeChamfer: z.number().min(0).max(3),
  lidEnabled: z.boolean(),
  lidThickness: z.number().min(1.2).max(6),
  lidHeight: z.number().min(0).max(30),
  lidClearance: z.number().min(0.1).max(0.6),
  lidCornerRadius: z.number().min(0).max(40),
  lidFitDepth: z.number().min(2).max(20),
  fitType: z.enum(FIT_TYPES),
  frontPanelWidth: z.number().min(40).max(300),
  frontPanelHeight: z.number().min(40).max(300),
  frontPanelThickness: z.number().min(1).max(5),
  frontPanelCornerRadius: z.number().min(0).max(40),
  borderWidth: z.number().min(3).max(20),
  surfaceCurvature: z.enum(SURFACE_CURVATURES),
  pattern: z.enum(PANEL_PATTERNS),
  holeDiameter: z.number().min(0.8).max(6),
  holeSpacingX: z.number().min(1).max(10),
  holeSpacingY: z.number().min(1).max(10),
  gridThickness: z.number().min(0.8).max(4),
  gridAngle: z.number().min(0).max(90),
  handleEnabled: z.boolean(),
  handleDiameter: z.number().min(3).max(20),
  handleLength: z.number().min(5).max(60),
  handleBaseDiameter: z.number().min(4).max(30),
  handleTipRadius: z.number().min(0).max(5),
  handleSide: z.enum(HANDLE_SIDES),
  handleHeight: z.number().min(0).max(1),
  baseEnabled: z.boolean(),
  baseHeight: z.number().min(0).max(30),
  baseThickness: z.number().min(1.2).max(6),
  baseCornerRadius: z.number().min(0).max(40),
  printClearance: z.number().min(0.2).max(0.3),
  bodyColor: z.enum(PLA_COLORS),
  accentColor: z.enum(PLA_COLORS),
})

export type ThermoformerParams = z.infer<typeof thermoformerParamsSchema>

/** Campos que alteram geometria. Cores ficam de fora para não rebuildar. */
export type ThermoformerGeometryParams = Omit<ThermoformerParams, 'bodyColor' | 'accentColor'>

export const defaultThermoformerParams: ThermoformerParams = {
  productType: PRODUCT_TYPE,
  width: 160,
  depth: 120,
  height: 60,
  cornerRadius: 10,
  wallThickness: 2.4,
  bottomThickness: 2.4,
  rimHeight: 3,
  rimThickness: 3,
  edgeChamfer: 0.4,
  lidEnabled: true,
  lidThickness: 2.4,
  lidHeight: 6,
  lidClearance: 0.3,
  lidCornerRadius: 14,
  lidFitDepth: 6,
  fitType: 'external',
  frontPanelWidth: 140,
  frontPanelHeight: 50,
  frontPanelThickness: 3,
  frontPanelCornerRadius: 8,
  borderWidth: 8,
  surfaceCurvature: 'flat',
  pattern: 'perforated',
  holeDiameter: 2.5,
  holeSpacingX: 5,
  holeSpacingY: 5,
  gridThickness: 1.5,
  gridAngle: 0,
  handleEnabled: true,
  handleDiameter: 8,
  handleLength: 25,
  handleBaseDiameter: 16,
  handleTipRadius: 2,
  handleSide: 'right',
  handleHeight: 0.5,
  baseEnabled: true,
  baseHeight: 6,
  baseThickness: 2.4,
  baseCornerRadius: 13,
  printClearance: 0.25,
  bodyColor: '#22c55e',
  accentColor: '#f5f5f5',
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'termoformador'
}
