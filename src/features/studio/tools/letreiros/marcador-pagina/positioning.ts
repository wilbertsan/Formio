export const TEXT_MARGIN = 3
/** Pequena sobreposição abaixo do fundo da base para fundir o texto. */
export const TEXT_Z_OFFSET = 0.01
/** Rotação do texto em relação ao marcador (anti-horário, leitura de baixo para cima). */
export const TEXT_ROTATION = Math.PI / 2

/** X fixo da parede: margem nominal de 3mm em relação à largura. */
export function fixedTextX(width: number, wallThickness: number): number {
  return width / 2 - wallThickness / 2 - TEXT_MARGIN
}

/**
 * Centro da base para que a lateral direita entre metade da espessura da
 * parede de texto, mantendo a largura nominal da base.
 */
export function bookmarkBaseCenterX(width: number, wallThickness: number): number {
  return fixedTextX(width, wallThickness) - width / 2
}
