import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import {
  IMPORTED_TEXTURES,
  IMPORTED_TEXTURE_IDS,
} from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextures'
import { IMPORTED_TEXTURE_DATA } from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextureData'

describe('imported textures', () => {
  it('lista 14 ids únicos e cobre a metadata e os dados', () => {
    expect(IMPORTED_TEXTURE_IDS).toHaveLength(14)
    expect(new Set(IMPORTED_TEXTURE_IDS).size).toBe(14)

    const ids = [...IMPORTED_TEXTURE_IDS].sort()
    expect(Object.keys(IMPORTED_TEXTURES).sort()).toEqual(ids)
    expect(Object.keys(IMPORTED_TEXTURE_DATA).sort()).toEqual(ids)
  })

  it('mantém a metadata dentro do contrato', () => {
    for (const id of IMPORTED_TEXTURE_IDS) {
      const meta = IMPORTED_TEXTURES[id]
      expect(meta.width, id).toBe(512)
      expect(meta.height, id).toBe(256)
      expect(meta.nativeDepth, id).toBeGreaterThanOrEqual(1)
      expect(meta.nativeDepth, id).toBeLessThanOrEqual(5)
      expect(meta.maxSlopeDeg, id).toBeGreaterThanOrEqual(20)
      expect(meta.maxSlopeDeg, id).toBeLessThanOrEqual(85)
      expect(meta.label.trim().length, id).toBeGreaterThan(0)
    }
  })

  it('decodifica cada mapa em 131.072 bytes não uniformes', () => {
    for (const id of IMPORTED_TEXTURE_IDS) {
      const meta = IMPORTED_TEXTURES[id]
      const data = Buffer.from(IMPORTED_TEXTURE_DATA[id], 'base64')
      expect(data.length, id).toBe(meta.width * meta.height)
      expect(new Set(data).size, id).toBeGreaterThanOrEqual(20)
    }
  })

  it('preserva os labels acentuados', () => {
    expect(IMPORTED_TEXTURES.tijolos_rusticos.label).toBe('Tijolos rústicos')
    expect(IMPORTED_TEXTURES.paralelepipedos.label).toBe('Paralelepípedos')
    expect(IMPORTED_TEXTURES.paralelepipedos_suaves.label).toBe(
      'Paralelepípedos suaves',
    )
    expect(IMPORTED_TEXTURES.azulejos.label).toBe('Azulejos 1"')
  })
})
