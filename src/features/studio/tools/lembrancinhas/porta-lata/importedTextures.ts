// Gerado por scripts/texture-import.mjs — não editar à mão.
export const IMPORTED_TEXTURE_IDS = [
  'azulejos',
  'mosaico',
  'tijolos_pequenos',
  'reboco_pequeno',
  'tijolos_rusticos',
  'reboco_quebrado',
  'tijolos_limpos',
  'paralelepipedos',
  'paralelepipedos_suaves',
  'placa_diamantada',
  'pedra_hexagonal',
  'asfalto',
  'hex_scifi',
  'hex_scifi_pequeno',
] as const

export type ImportedTextureId = (typeof IMPORTED_TEXTURE_IDS)[number]

export interface ImportedTextureMeta {
  label: string
  nativeDepth: number
  maxSlopeDeg: number
  width: number
  height: number
}

export const IMPORTED_TEXTURES: Record<ImportedTextureId, ImportedTextureMeta> = {
  azulejos: { label: 'Azulejos 1"', nativeDepth: 2.25, maxSlopeDeg: 65.09, width: 192, height: 96 },
  mosaico: { label: 'Mosaico', nativeDepth: 3.17, maxSlopeDeg: 71.55, width: 192, height: 96 },
  tijolos_pequenos: { label: 'Tijolos pequenos', nativeDepth: 1.59, maxSlopeDeg: 55.82, width: 192, height: 96 },
  reboco_pequeno: { label: 'Reboco quebrado pequeno', nativeDepth: 2.26, maxSlopeDeg: 49.06, width: 192, height: 96 },
  tijolos_rusticos: { label: 'Tijolos rústicos', nativeDepth: 2.4, maxSlopeDeg: 62.67, width: 192, height: 96 },
  reboco_quebrado: { label: 'Reboco quebrado', nativeDepth: 2.08, maxSlopeDeg: 61.18, width: 192, height: 96 },
  tijolos_limpos: { label: 'Tijolos limpos', nativeDepth: 1.21, maxSlopeDeg: 49.07, width: 192, height: 96 },
  paralelepipedos: { label: 'Paralelepípedos', nativeDepth: 1.79, maxSlopeDeg: 59.71, width: 192, height: 96 },
  paralelepipedos_suaves: { label: 'Paralelepípedos suaves', nativeDepth: 1.79, maxSlopeDeg: 59.64, width: 192, height: 96 },
  placa_diamantada: { label: 'Placa diamantada', nativeDepth: 2.89, maxSlopeDeg: 70.11, width: 192, height: 96 },
  pedra_hexagonal: { label: 'Pedra hexagonal', nativeDepth: 4.23, maxSlopeDeg: 73.09, width: 192, height: 96 },
  asfalto: { label: 'Asfalto', nativeDepth: 2.54, maxSlopeDeg: 64.66, width: 192, height: 96 },
  hex_scifi: { label: 'Hex sci-fi', nativeDepth: 3.88, maxSlopeDeg: 74.25, width: 192, height: 96 },
  hex_scifi_pequeno: { label: 'Hex sci-fi pequeno', nativeDepth: 2.96, maxSlopeDeg: 70.59, width: 192, height: 96 },
}
