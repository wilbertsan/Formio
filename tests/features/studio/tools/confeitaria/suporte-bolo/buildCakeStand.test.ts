import { describe, it, expect } from 'vitest'
import { buildCakeStand } from '@/features/studio/tools/confeitaria/suporte-bolo/buildCakeStand'
import { defaultCakeStandParams } from '@/features/studio/tools/confeitaria/suporte-bolo/schema'

describe('buildCakeStand', () => {
  it('gera geometria para configuração padrão', () => {
    const result = buildCakeStand({ params: defaultCakeStandParams })
    
    expect(result.base).toBeDefined()
    expect(result.column).toBeDefined()
    expect(result.plate).toBeDefined()
  })

  it('base tem bounding box correto', () => {
    const result = buildCakeStand({ params: defaultCakeStandParams })
    result.base.computeBoundingBox()
    const bb = result.base.boundingBox!
    
    // Diâmetro 150mm, centro em 0
    expect(bb.min.x).toBeCloseTo(-75, 0)
    expect(bb.max.x).toBeCloseTo(75, 0)
  })

  it('coluna tem altura correta para medium', () => {
    const result = buildCakeStand({ params: defaultCakeStandParams })
    result.column.computeBoundingBox()
    const bb = result.column.boundingBox!
    
    // Altura medium = 60mm
    const height = bb.max.z - bb.min.z
    expect(height).toBeCloseTo(60, 0)
  })

  it('coluna tem altura correta para low', () => {
    const result = buildCakeStand({
      params: { ...defaultCakeStandParams, height: 'low' },
    })
    result.column.computeBoundingBox()
    const bb = result.column.boundingBox!
    
    // Altura low = 40mm
    const height = bb.max.z - bb.min.z
    expect(height).toBeCloseTo(40, 0)
  })

  it('coluna tem altura correta para high', () => {
    const result = buildCakeStand({
      params: { ...defaultCakeStandParams, height: 'high' },
    })
    result.column.computeBoundingBox()
    const bb = result.column.boundingBox!
    
    // Altura high = 80mm
    const height = bb.max.z - bb.min.z
    expect(height).toBeCloseTo(80, 0)
  })

  it('prato com borda gera geometria', () => {
    const result = buildCakeStand({
      params: { ...defaultCakeStandParams, plateHasRim: true },
    })
    result.plate.computeBoundingBox()
    const bb = result.plate.boundingBox!
    
    expect(bb.max.z).toBeGreaterThan(bb.min.z)
  })

  it('prato sem borda gera geometria', () => {
    const result = buildCakeStand({
      params: { ...defaultCakeStandParams, plateHasRim: false },
    })
    result.plate.computeBoundingBox()
    const bb = result.plate.boundingBox!
    
    expect(bb.max.z).toBeGreaterThan(bb.min.z)
  })

  it('base com decoração hexagon gera geometria válida', () => {
    const result = buildCakeStand({
      params: { ...defaultCakeStandParams, baseDecoration: 'hexagon' },
    })
    expect(result.base).toBeDefined()
  })

  it('base com decoração lines gera geometria válida', () => {
    const result = buildCakeStand({
      params: { ...defaultCakeStandParams, baseDecoration: 'lines' },
    })
    expect(result.base).toBeDefined()
  })

  it('base com decoração waves gera geometria válida', () => {
    const result = buildCakeStand({
      params: { ...defaultCakeStandParams, baseDecoration: 'waves' },
    })
    expect(result.base).toBeDefined()
  })

  it('base sem decoração gera geometria válida', () => {
    const result = buildCakeStand({
      params: { ...defaultCakeStandParams, baseDecoration: 'none' },
    })
    expect(result.base).toBeDefined()
  })
})