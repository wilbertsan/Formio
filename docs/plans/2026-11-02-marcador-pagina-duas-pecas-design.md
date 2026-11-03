# Design — Marcador de Página em duas peças com encaixe em U

Data: 2026-11-02
Status: Aprovado
Escopo: separar o marcador em **base** e **texto** para impressão 3D,
com encaixe em U na traseira do texto e exportação em dois STLs.

## Contexto

Hoje o marcador é um STL único (`base + text` mesclados). A parede de texto em
pé é difícil de imprimir junto com a base. A base será impressa plana e o texto
deitado; depois as peças se encaixam e podem ser coladas.

## Decisões

| Decisão | Escolha |
|---|---|
| Entrega | Dois STLs: `nome-base.stl` e `nome-texto.stl` |
| Encaixe | U horizontal na traseira do texto, ao longo de toda a largura |
| Fechamento do U | Duas barras no texto (inferior + superior); a base desliza entre elas |
| Barras | 1,5mm de profundidade × 0,8mm de altura |
| Folga | 0,2mm; vão entre as barras = espessura da base + 0,2mm |
| Orientação de impressão | Base plana; texto exportado deitado (face frontal na mesa) |
| Textura | Permanece só na base; faixa do encaixe fica lisa |

## Geometria

Coordenadas locais (mm):

- **Base**
  - Largura nominal `width` no eixo X, comprimento `length` no Y, espessura
    `thickness` no Z.
  - Borda direita em `x = -JOINT_CLEARANCE` (0,2mm de folga até a traseira do
    texto).
  - Base de `x = -JOINT_CLEARANCE - width` até `-JOINT_CLEARANCE`.
  - Centro: `splitBaseCenterX(width) = -JOINT_CLEARANCE - width / 2`.
  - Textura recuada da borda direita em `JOINT_LIP_DEPTH + PATTERN_MARGIN`
    (1,5 + 1 = 2,5mm), para não colidir com as barras.

- **Texto**
  - Parede de texto em pé, correndo em Y, subindo em Z.
  - Face traseira em `x = 0`; centro em `x = relief / 2`.
  - Base do texto em `z = 0`.
  - Duas barras em U na traseira, começando na metade da espessura do texto
    (`relief/2`) e indo para trás:
    - **barra inferior**: `x` de `-JOINT_BAR_DEPTH` a `relief/2`, `z` de
      `-JOINT_BAR_HEIGHT` a `0` (sob o fundo da base);
    - **barra superior**: `x` de `-JOINT_BAR_DEPTH` a `relief/2`, `z` de
      `thickness + JOINT_CLEARANCE` a
      `thickness + JOINT_CLEARANCE + JOINT_BAR_HEIGHT`;
    - ambas com `y` de `-textWidth/2` a `+textWidth/2`.
  - O vão entre as barras é `thickness + JOINT_CLEARANCE` (0,2mm de folga).
  - As barras são sólidas atrás do texto; podem atravessar os vãos entre letras.

- **Montagem**
  - A base desliza pela lateral (Y) entre as duas barras.
  - O U é formado por: barra inferior (baixo), traseira do texto (lado) e barra
    superior (topo).
  - Folga de 0,2mm no vão entre as barras e 0,2mm entre a borda da base e a
    traseira do texto; cola/fricção fixam.
  - A barra inferior passa sob a base; a peça montada passa a apoiar na barra
    inferior do texto.

- **Exportação**
  - Base: geometria como está (plana).
  - Texto: clonar, rotacionar `+90°` em Y e transladar em Z para apoiar a face
    frontal na mesa; as barras ficam como nervuras no texto deitado.
  - Downloads: `nome-base.stl` e `nome-texto.stl`.

## Arquivos

**Alterar**
- `positioning.ts` — constantes do encaixe e posições `splitBaseCenterX` /
  `splitTextCenterX`.
- `shapes.ts` — base com borda direita em `-JOINT_CLEARANCE`.
- `buildBookmark.ts` — texto com traseira em 0, base em z = 0, barras em U
  mesclado ao texto.
- `patterns.ts` — área da textura recuada da faixa do encaixe.
- `exportStl.ts` — `prepareTextForPrint` e exportação de dois STLs.
- `StudioPage.tsx` — exportar as duas peças.
- Testes: `positioning`, `shapes`, `buildBookmark`, `patterns`, `exportStl`,
  `StudioPage` e `useBookmark` (se necessário).
- `AGENTS.md` e `docs/frontend/studio.md`.

## Testes

- Base: borda direita em `-0,2`, largura nominal preservada, centro correto.
- Texto: traseira em `x=0`, base em `z=0`, barras com as dimensões/posição.
- Textura: não invade a faixa de 2,5mm do encaixe.
- Export: dois downloads, nomes `-base`/`-texto`, dois blobs; texto deitado
  (min Z = 0 e altura de impressão = relief + lipDepth).
- Preview continua montado; status bar mantém a largura nominal da base.

## Fora de escopo

- Encaixe com trava/dovetail, parafusos ou ímãs.
- Impressão em resina vs. filamento (tolerâncias específicas).
- Terceira peça, suportes ou instruções de montagem impressas.

## Definition of Done

- lint, typecheck, test e build verdes.
- STL da base e STL do texto baixados separadamente.
- Texto deitado para impressão; base plana.
- U abraça a borda da base com a folga definida.
- Docs atualizadas.
