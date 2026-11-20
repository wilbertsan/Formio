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
  azulejos: { label: 'Azulejos 1"', nativeDepth: 2.18, maxSlopeDeg: 78.35, width: 512, height: 256 },
  mosaico: { label: 'Mosaico', nativeDepth: 3.15, maxSlopeDeg: 82.7, width: 512, height: 256 },
  tijolos_pequenos: { label: 'Tijolos pequenos', nativeDepth: 1.54, maxSlopeDeg: 69.61, width: 512, height: 256 },
  reboco_pequeno: { label: 'Reboco quebrado pequeno', nativeDepth: 2.28, maxSlopeDeg: 67.83, width: 512, height: 256 },
  tijolos_rusticos: { label: 'Tijolos rústicos', nativeDepth: 2.29, maxSlopeDeg: 74.93, width: 512, height: 256 },
  reboco_quebrado: { label: 'Reboco quebrado', nativeDepth: 2.07, maxSlopeDeg: 72.99, width: 512, height: 256 },
  tijolos_limpos: { label: 'Tijolos limpos', nativeDepth: 1.21, maxSlopeDeg: 72.04, width: 512, height: 256 },
  paralelepipedos: { label: 'Paralelepípedos', nativeDepth: 1.79, maxSlopeDeg: 77.66, width: 512, height: 256 },
  paralelepipedos_suaves: { label: 'Paralelepípedos suaves', nativeDepth: 1.78, maxSlopeDeg: 77.56, width: 512, height: 256 },
  placa_diamantada: { label: 'Placa diamantada', nativeDepth: 2.85, maxSlopeDeg: 81.22, width: 512, height: 256 },
  pedra_hexagonal: { label: 'Pedra hexagonal', nativeDepth: 4.25, maxSlopeDeg: 80.54, width: 512, height: 256 },
  asfalto: { label: 'Asfalto', nativeDepth: 2.4, maxSlopeDeg: 79.99, width: 512, height: 256 },
  hex_scifi: { label: 'Hex sci-fi', nativeDepth: 3.91, maxSlopeDeg: 82.27, width: 512, height: 256 },
  hex_scifi_pequeno: { label: 'Hex sci-fi pequeno', nativeDepth: 2.96, maxSlopeDeg: 82.52, width: 512, height: 256 },
}
