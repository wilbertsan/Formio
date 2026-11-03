import {
  TEXT_MARGIN,
  TEXT_ROTATION,
} from '@/features/studio/tools/letreiros/marcador-pagina/positioning'

describe('positioning', () => {
  it('mantém a margem de 3mm', () => {
    expect(TEXT_MARGIN).toBe(3)
  })

  it('gira o texto 90°', () => {
    expect(TEXT_ROTATION).toBeCloseTo(Math.PI / 2)
  })
})
