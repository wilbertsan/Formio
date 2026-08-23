import { z } from 'zod'

export const keychainParamsSchema = z.object({
  name: z.string().trim().min(1).max(12),
  shape: z.enum(['rect', 'circle', 'heart']),
  textMode: z.enum(['raised', 'engraved']),
  width: z.number().min(20).max(80),
  height: z.number().min(20).max(80),
  thickness: z.number().min(2).max(6),
  textHeight: z.number().min(10).max(24),
  textDepth: z.number().min(0.4).max(2),
  holeDiameter: z.number().min(3).max(8),
})

export type KeychainParams = z.infer<typeof keychainParamsSchema>
export type KeychainShape = KeychainParams['shape']
export type KeychainTextMode = KeychainParams['textMode']

export const defaultKeychainParams: KeychainParams = {
  name: 'Meu nome',
  shape: 'rect',
  textMode: 'raised',
  width: 50,
  height: 25,
  thickness: 3,
  textHeight: 16,
  textDepth: 1,
  holeDiameter: 5,
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/gi, 'c')
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'chaveiro'
}
