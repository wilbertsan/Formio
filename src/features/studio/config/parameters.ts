import { z } from 'zod'

export const modelParametersSchema = z.object({
  width: z.number().min(10).max(100),
  height: z.number().min(10).max(100),
  depth: z.number().min(10).max(100),
  radius: z.number().min(0).max(10),
  segments: z.number().int().min(2).max(32),
})

export type ModelParameters = z.infer<typeof modelParametersSchema>

export type ParameterKey = keyof ModelParameters

export interface ParameterDefinition {
  key: ParameterKey
  label: string
  min: number
  max: number
  step: number
  unit: 'mm'
}

export const parameterDefinitions: ParameterDefinition[] = [
  { key: 'width', label: 'Largura', min: 10, max: 100, step: 1, unit: 'mm' },
  { key: 'height', label: 'Altura', min: 10, max: 100, step: 1, unit: 'mm' },
  { key: 'depth', label: 'Profundidade', min: 10, max: 100, step: 1, unit: 'mm' },
  { key: 'radius', label: 'Raio de arredondamento', min: 0, max: 10, step: 1, unit: 'mm' },
  { key: 'segments', label: 'Segmentos', min: 2, max: 32, step: 1, unit: 'mm' },
]

export const defaultParameters: ModelParameters = {
  width: 60,
  height: 40,
  depth: 30,
  radius: 4,
  segments: 8,
}

export function clampParameter(key: ParameterKey, value: number): number {
  const def = parameterDefinitions.find((d) => d.key === key)
  if (!def) return value
  const stepped = Math.round(value / def.step) * def.step
  return Math.min(def.max, Math.max(def.min, stepped))
}
