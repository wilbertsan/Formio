import {
  clampTextPosition,
  defaultStackOffsets,
} from '@/features/studio/keychain/positioning'

describe('defaultStackOffsets', () => {
  it('um texto fica centrado em 0', () => {
    expect(defaultStackOffsets([10])).toEqual([0])
  })

  it('dois textos ficam um acima e um abaixo do centro', () => {
    const offsets = defaultStackOffsets([10, 10])
    expect(offsets[0]).toBeGreaterThan(0)
    expect(offsets[1]).toBeLessThan(0)
    expect(offsets[0] + offsets[1]).toBeCloseTo(0, 5)
  })

  it('espaçamento cresce com a altura do texto', () => {
    const small = defaultStackOffsets([8, 8])
    const large = defaultStackOffsets([16, 16])
    expect(Math.abs(large[0] - large[1])).toBeGreaterThan(Math.abs(small[0] - small[1]))
  })
})

describe('clampTextPosition', () => {
  const pieceBB = { minX: -25, maxX: 25, minY: -12.5, maxY: 12.5 }
  const textHalf = { halfWidth: 10, halfHeight: 5 }
  const hole = { x: 0, y: 10, radius: 4.5 }

  it('mantém posição válida', () => {
    const result = clampTextPosition({ x: 0, y: 0, ...textHalf }, pieceBB, hole)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
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
})