# Design: Topo de Bolo — Seção única de conteúdo

**Data:** 07 de novembro de 2026
**Status:** Aprovado
**Categoria:** Confeitaria
**Ferramenta:** topo-bolo

## Visão Geral

Unificar as seções **Texto** e **Ícone** do painel do topo de bolo em uma única
seção **Conteúdo**, mantendo 1–3 textos independentes e um ícone SVG opcional.
Texto e ícone passam a ser posicionados livremente na placa pelo editor 2D, sem
os presets `Acima`/`Centro`.

## Contexto

O painel atual separa os controles em duas seções:

- **Texto** — lista de 1–3 textos, campos do texto selecionado, modo
  `raised`/`cut` e botão para abrir o editor 2D.
- **Ícone** — upload do SVG, select de posição (`above`/`center`) e escala.

O carimbo de brigadeiro usa uma seção única de **Conteúdo**, o que serviu de
referência para a consolidação. Diferente do carimbo, o topo de bolo continua
aceitando múltiplos textos e um ícone ao mesmo tempo.

## Decisões

### 1. Seção única no painel

O accordion passa a ter as seções **Conteúdo**, **Formato**, **Fixação** e
**Aparência**.

A seção **Conteúdo** contém, nesta ordem:

1. Select **Modo do conteúdo** (`Relevo` / `Corte vazado`) — antes rotulado
   “Modo do texto” e restrito à seção Texto.
2. Lista de textos (1–3) com adicionar, remover e seleção.
3. Campos do texto selecionado: conteúdo, fonte, largura, altura e relevo.
4. Subseção **Ícone SVG**: upload, remover, escala e dica de arraste.
5. Botão **Posicionar conteúdo**, que abre o editor 2D para textos e ícone.

O select de posição `Acima`/`Centro` é removido. O posicionamento do ícone passa
a ser feito por offsets X/Y, como nos textos.

### 2. Modelo de dados

O schema ganha offsets próprios para o ícone e perde o preset de posição:

```ts
svgIcon: z.string().nullable(),
iconScale: z.number().min(0.5).max(2),
iconOffsetX: z.number().min(-55).max(55),
iconOffsetY: z.number().min(-35).max(35),
```

- `iconOffsetX`/`iconOffsetY` usam os mesmos limites dos textos.
- Padrão `0,0` (centro da placa).
- `iconPosition` é removido.
- `texts[]`, `textMode`, `svgIcon` e `iconScale` permanecem inalterados.
- O resultado de `buildCakeTopper` e a exportação STL não mudam.

### 3. Editor 2D

O `TextPositionEditor` passa a desenhar e arrastar dois tipos de item:

- Blocos de texto, com o comportamento atual.
- Um bloco **Ícone**, desenhado quando `svgIcon` está definido.

O bloco do ícone usa a proporção aproximada real do SVG:

- `svgBounds(svg)` fornece largura, altura e distância do vértice mais distante.
- A escala usada é a mesma do builder:
  `(maxRadius - lineWidth / 2) / bounds.farthest`, com
  `maxRadius = min(width, height) / 3 * iconScale`.
- As meias-extensões incluem uma folga de 0,5 mm para traço/bevel.

O arraste do ícone usa a margem de 1 mm (`ICON_MARGIN`) e atualiza
`iconOffsetX`/`iconOffsetY` de forma atômica por meio de uma ação `moveIcon` no
reducer. O arraste dos textos continua usando a margem de 4 mm e a ação
`updateTextById`.

O título e os rótulos de acessibilidade passam de “textos” para “conteúdo”:

- Diálogo: `Posicionamento de conteúdo`
- Canvas: `Área de posicionamento de conteúdo`
- Texto de ajuda: `Arraste os textos e o ícone para reposicionar`

### 4. Geometria

`buildIconGeometry` deixa de calcular a posição automática acima do texto:

- Remove a dependência de `textMaxY` e de `iconPosition`.
- Usa `clampToOutline` com `params.iconOffsetX`, `params.iconOffsetY` e
  `ICON_MARGIN`.
- Mantém o encolhimento do ícone para caber no contorno
  (`fitScaleToOutline`).
- O ícone continua usando a mesma profundidade de relevo/corte e o mesmo giro
  de 180° no eixo Z.

`buildTextGeometries` deixa de retornar `maxY`, que existia apenas para
posicionar o ícone acima do texto.

### 5. Estado

O reducer de `useCakeTopper` ganha:

```ts
| { type: 'moveIcon'; x: number; y: number }
```

A ação clampa os offsets com `NUMERIC_RANGES` e valida o resultado com o schema.
O hook expõe `moveIcon(x, y)`.

### 6. Testes

- Schema: rejeita offsets fora da faixa; default contém os novos campos;
  `iconPosition` não existe mais.
- Hook: `moveIcon` atualiza os dois offsets e clampa os limites.
- Builder: ícone respeita offsets; ícone é limitado ao contorno; testes
  existentes deixam de usar `iconPosition`.
- Painel: seção única **Conteúdo**; subseção **Ícone SVG**; botão
  **Posicionar conteúdo**.
- Editor: desenha e arrasta o ícone; arraste do ícone respeita a margem de 1 mm.
- Docs: `topo-bolo/AGENTS.md` e `docs/frontend/studio.md`.

## Fora de escopo

- Tornar texto e ícone mutuamente exclusivos (modelo do carimbo).
- Alterar o limite de 1–3 textos.
- Alterar a exportação STL ou o formato de `BuildCakeTopperResult`.
- Renomear `TextPositionEditor.tsx` ou seu `data-testid`.
