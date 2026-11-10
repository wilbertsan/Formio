# Design: Topo de Bolo — Editor de posicionamento com paridade ao chaveiro

**Data:** 09 de novembro de 2026
**Status:** Aprovado
**Categoria:** Confeitaria
**Ferramenta:** topo-bolo

## Visão Geral

Substituir o editor 2D em canvas do topo de bolo por um editor SVG com a mesma
experiência do chaveiro: contorno real da placa, tamanhos reais dos conteúdos
vindos do build, arraste por pointer/touch, nudge por setas, seleção acessível,
fechamento por fundo/Escape e botão **Concluir**.

## Contexto

Hoje o `TextPositionEditor` do topo de bolo:

- desenha em canvas;
- usa caixas aproximadas para os textos (`width/2`, `height/2`), não os limites
  reais da geometria;
- só responde a mouse;
- não tem nudge por teclado;
- não fecha ao clicar no fundo;
- desenha `custom` como retângulo, não o contorno real.

O editor do chaveiro já resolve esses pontos com SVG, pointer events e metadados
de geometria (`contentItems`).

## Decisões

### 1. Editor SVG

- `TextPositionEditor` passa a renderizar um `<svg>`.
- `viewBox` calculado a partir do contorno da placa + 5mm de padding.
- Placa desenhada com as shapes reais:
  - `circle`, `oval`, `rounded-rect` e `custom` a partir de `Shape.getPoints()`;
  - furos de `custom` desenhados no mesmo `path` com `fillRule="evenodd"`.
- Área útil tracejada em 4mm (margem dos textos). O ícone pode ir até 1mm; o clamp
  por conteúdo continua sendo a fonte da verdade.

### 2. Metadados de conteúdo no build

Adicionar ao resultado:

```ts
export interface ContentBounds {
  id: string          // id do texto ou 'icon'
  kind: 'text' | 'icon'
  halfWidth: number
  halfHeight: number
}

export interface BuildCakeTopperResult {
  plate: BufferGeometry
  relief: BufferGeometry | null
  support: BufferGeometry | null
  contentItems: ContentBounds[]
}
```

- `buildTextGeometries` e `buildIconGeometry` devolvem, além da geometria, as
  meias-extensões reais após o encaixe/escala/posicionamento.
- `buildRelief` agrega os itens.
- `buildCakeTopper` inclui `contentItems`.

### 3. Contorno da placa

- Exportar `getPlateShapes(params): Shape[]` do `buildCakeTopper.ts`.
- O editor usa as shapes para desenhar a placa e calcular os bounds reais
  (especialmente em `custom`).
- Para `custom`, usa os bounds reais no `clampToOutline`.

### 4. Interação

- Arraste com `pointerdown`/`pointermove`/`pointerup`/`pointercancel`,
  `touch-none select-none`, limiar de 0,5mm e listeners no `document`.
- Conversão de coordenadas com `getScreenCTM` e fallback para
  `getBoundingClientRect`; eixo Y invertido como no chaveiro.
- Clamp com `clampToOutline`, usando as meias-extensões reais e a margem do
  conteúdo (4mm texto, 1mm ícone).
- Teclado: cada conteúdo é um `<g role="button" tabIndex={0} aria-label="Mover ...">`;
  setas movem 1mm com clamp.
- Seleção por `selectedContentId` (`text.id` ou `'icon'`).
- Fechamento: Escape, clique no fundo, botão X e **Concluir**.
- Foco inicial no botão de fechar; diálogo com `role="dialog"`, `aria-modal` e
  `aria-labelledby`.

### 5. Integração com o painel

- `StudioPanel` recebe `geometry` e mantém `selectedContentId`.
- Textos selecionados na lista continuam alimentando os campos de texto.
- O ícone é selecionável apenas no editor; a subseção **Ícone** do painel
  permanece como está.
- O editor chama `onMoveContent(id, x, y)`; o painel roteia:
  - `id === 'icon'` → `onMoveIcon`;
  - caso contrário → `onUpdateTextById(id, { offsetX, offsetY })`.
- `StudioPage` passa `geometry` ao `TopoBoloTool`.

### 6. Fallback sem geometria

- Se `geometry` for `null` (fonte ainda carregando), o editor usa:
  - textos: `width/2`, `height/2`;
  - ícone: `iconGeometryHalfSize` + `fitIconHalfSize` com os bounds da placa.

### 7. Testes

- Builder: `contentItems` com ids, kinds e meias-extensões reais.
- Editor:
  - renderiza SVG, contorno e caixas;
  - arraste por pointer e commit no pointerup;
  - nudge por setas;
  - seleção ao clicar;
  - clamp;
  - fechar por Concluir, fundo e Escape;
  - foco inicial e diálogo acessível;
  - fallback sem geometria.
- Painel/StudioPage: repasse de `geometry`, seleção e abertura do editor.

## Fora de escopo

- Alterar geometria, clamp ou tempo de build.
- Unificar o ícone como chip no painel.
- Alterar preview 3D ou exportação STL.
