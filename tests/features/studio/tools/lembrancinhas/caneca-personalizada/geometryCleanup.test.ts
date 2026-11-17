import { describe, it, expect } from 'vitest'
import {
  BufferGeometry,
  Float32BufferAttribute,
  Uint32BufferAttribute,
} from 'three'
import { removeDegenerateTriangles } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/geometryCleanup'
import { isClosed } from './geometryTestUtils'

/** Tetraedro fechado com winding para fora, opcionalmente com abas extras. */
function tetrahedron(extraIndices: number[] = []): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], 3),
  )
  geometry.setIndex([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3, ...extraIndices])
  return geometry
}

function triangleCount(geometry: BufferGeometry): number {
  return geometry.getIndex()!.count / 3
}

function trackDispose(geometry: BufferGeometry): () => boolean {
  let disposed = false
  geometry.addEventListener('dispose', () => {
    disposed = true
  })
  return () => disposed
}

describe('removeDegenerateTriangles', () => {
  it('fecha a malha ao remover duas abas com aresta colapsada', () => {
    // As duas abas compartilham a aresta colapsada 0–0 e repetem as arestas
    // 0–1 e 0–2 já usadas pelo tetraedro (contagem 4 em cada).
    const geometry = tetrahedron([0, 0, 1, 0, 0, 2])
    expect(triangleCount(geometry)).toBe(6)
    expect(isClosed(geometry)).toBe(false)

    const cleaned = removeDegenerateTriangles(geometry)

    expect(triangleCount(cleaned)).toBe(4)
    expect(isClosed(cleaned)).toBe(true)
    cleaned.dispose()
  })

  it('remove triângulos colapsados e preserva position, normal, uv e largura do índice', () => {
    // O tetraedro tem 4 vértices; a aba usa os mesmos índices, então os
    // atributos continuam com 4 elementos após a limpeza.
    const geometry = tetrahedron([0, 0, 1])
    geometry.setAttribute(
      'normal',
      new Float32BufferAttribute([0, 0, -1, 0, -1, 0, -1, 0, 0, 1, 1, 1], 3),
    )
    geometry.setAttribute(
      'uv',
      new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2),
    )
    geometry.setIndex(new Uint32BufferAttribute(geometry.getIndex()!.array, 1))
    expect(geometry.getIndex()!.array).toBeInstanceOf(Uint32Array)

    const cleaned = removeDegenerateTriangles(geometry)

    expect(cleaned.getAttribute('position').count).toBe(4)
    expect(cleaned.getAttribute('normal').count).toBe(4)
    expect(cleaned.getAttribute('uv').count).toBe(4)
    expect(cleaned.getAttribute('uv').itemSize).toBe(2)
    expect(cleaned.getIndex()!.array).toBeInstanceOf(Uint32Array)
    expect(triangleCount(cleaned)).toBe(4)
    expect(isClosed(cleaned)).toBe(true)
    cleaned.dispose()
  })

  it('devolve entrada não indexada sem consumi-la', () => {
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
    )
    const wasDisposed = trackDispose(geometry)

    const result = removeDegenerateTriangles(geometry)

    // Contrato: sem índice não há como filtrar preservando os atributos, então
    // a mesma instância volta intocada e continua sendo do chamador.
    expect(result).toBe(geometry)
    expect(wasDisposed()).toBe(false)
    geometry.dispose()
  })

  it('consome e descarta a entrada indexada', () => {
    const geometry = tetrahedron([0, 0, 1])
    const wasDisposed = trackDispose(geometry)

    const cleaned = removeDegenerateTriangles(geometry)

    expect(cleaned).not.toBe(geometry)
    expect(wasDisposed()).toBe(true)
    expect(isClosed(cleaned)).toBe(true)
    cleaned.dispose()
  })

  it('reduz a contagem de triângulos e mantém a malha fechada', () => {
    const geometry = tetrahedron([0, 1, 1])
    const before = triangleCount(geometry)

    const cleaned = removeDegenerateTriangles(geometry)

    expect(triangleCount(cleaned)).toBeLessThan(before)
    expect(triangleCount(cleaned)).toBe(4)
    expect(isClosed(cleaned)).toBe(true)
    cleaned.dispose()
  })
})
