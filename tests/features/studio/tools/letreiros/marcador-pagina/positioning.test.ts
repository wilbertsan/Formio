import {
  TEXT_MARGIN,
  TEXT_Z_OFFSET,
  bookmarkBaseCenterX,
  fixedTextX,
} from '@/features/studio/tools/letreiros/marcador-pagina/positioning'

describe('fixedTextX', () => {
  it('encosta a parede a 3mm da borda direita nominal', () => {
    expect(fixedTextX(50, 1)).toBe(21.5)
  })

  it('acompanha a largura e a espessura da parede', () => {
    expect(fixedTextX(30, 2)).toBe(11)
  })
})

describe('bookmarkBaseCenterX', () => {
  it('desloca a base para a lateral entrar metade na parede', () => {
    expect(bookmarkBaseCenterX(50, 1)).toBe(-3.5)
    expect(bookmarkBaseCenterX(50, 2)).toBe(-4)
  })
})

describe('constantes', () => {
  it('exporta margem e profundidade', () => {
    expect(TEXT_MARGIN).toBe(3)
    expect(TEXT_Z_OFFSET).toBe(0.01)
  })
})
