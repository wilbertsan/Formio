import { clampTextPosition } from '@/features/studio/tools/chaveiros/chaveiro/positioning'

describe('clampTextPosition', () => {
  const pieceBB = { minX: -25, maxX: 25, minY: -12.5, maxY: 12.5 }
  const textHalf = { halfWidth: 10, halfHeight: 5 }
  const hole = { x: 0, y: 10, radius: 4.5 }

  it('mantém posição válida', () => {
    const result = clampTextPosition({ x: 0, y: -2, ...textHalf }, pieceBB, hole)
    expect(result.x).toBe(0)
    expect(result.y).toBe(-2)
  })

  it('limita texto dentro da borda da peça', () => {
    const result = clampTextPosition({ x: 30, y: 0, ...textHalf }, pieceBB, hole)
    expect(result.x).toBeLessThanOrEqual(pieceBB.maxX - 4)
    expect(result.x).toBeGreaterThanOrEqual(pieceBB.minX + 4)
  })

  it('limita verticalmente pela borda', () => {
    const result = clampTextPosition({ x: 0, y: 20, ...textHalf }, pieceBB, hole)
    expect(result.y).toBeLessThanOrEqual(pieceBB.maxY - 4)
  })

  it('empurra texto para fora do círculo do furo', () => {
    const result = clampTextPosition({ x: 0, y: 10, ...textHalf }, pieceBB, hole)
    const distance = Math.hypot(result.x - hole.x, result.y - hole.y)
    expect(distance).toBeGreaterThanOrEqual(hole.radius + 1)
  })

  it('empurra determinísticamente quando o texto está no centro do furo', () => {
    const centeredHole = { x: 0, y: 0, radius: 3 }
    const result = clampTextPosition(
      { x: 0, y: 0, halfWidth: 10, halfHeight: 2 },
      pieceBB,
      centeredHole,
    )
    expect(result.x).toBe(0)
    expect(result.y).toBe(4)
    expect(Math.hypot(result.x - centeredHole.x, result.y - centeredHole.y)).toBeGreaterThanOrEqual(4)
  })

  it('considera a extensão do conteúdo na folga do furo', () => {
    const localHole = { x: 0, y: 10, radius: 2.5 }
    const result = clampTextPosition(
      { x: 0, y: 7, halfWidth: 10, halfHeight: 4 },
      { minX: -25, maxX: 25, minY: -25, maxY: 25 },
      localHole,
    )
    const distance = Math.abs(result.y - localHole.y)
    expect(distance).toBeGreaterThanOrEqual(2.5 + 1 + 4 - 0.01)
  })
})