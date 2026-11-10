# Ferramenta: Cartão de Visita

## Status

Implementada — gera e exporta STL localmente no navegador.

## O que faz

Gera cartões de visita 3D retangulares com cantos arredondados, conteúdo livre
(1–3 textos ou ícones SVG), texto em relevo fixo de 1 mm e posicionamento no
editor 2D.

## Parâmetros

| Parâmetro | Tipo | Faixa | Default |
|---|---|---|---|
| width | number | 50–90mm | 85 |
| height | number | 30–60mm | 55 |
| thickness | number | 1–3mm | 2 |
| cornerRadius | number | 0–10mm | 3 |
| baseColor / letterColor | enum | 10 cores PLA | teal / white |
| contents[] | array | 1–3 itens | 3 textos |

Cada item de `contents[]` é uma união discriminada por `kind` (`text` | `icon`)
com `id` e `offsetX/Y` (-40–40mm):

- `text`: `content` (string, sem limite de caracteres, vazio permitido),
  `fontStyle` (normal/bold/serif), `fontSize` (3–12mm)
- `icon`: `svgIcon` (string|null), `iconScale` (0.5–1.0),
  `iconLineWidth` (0.1–1.5mm)

Texto e ícone são sempre elevados com `CONTENT_DEPTH = 1`mm. O cartão usa
`CONTENT_MARGIN = 3`mm e bevel de `BASE_BEVEL = 0.1`mm.

## Arquivos

```
tools/letreiros/cartao-visita/
  schema.ts              — validação Zod + defaults (contents discriminados)
  shapes.ts              — Shape do cartão com cantos arredondados
  autoFit.ts             — área útil, auto-fit e clamp
  textToGeometry.ts      — TextGeometry + normalização de acentos
  buildCard.ts           — composição base + conteúdo (merge)
  buildCard.worker.ts    — build em Web Worker
  workerClient.ts        — client do Worker
  workerGeometry.ts      — serialização do resultado
  exportStl.ts           — STL binário + download
  useCard.ts             — hook: estado + parse SVG + worker + debounce
  StudioPanel.tsx        — painel de parâmetros
  CardPreview.tsx        — preview R3F com 2 materiais
  TextPositionEditor.tsx — editor 2D SVG de posicionamento
```

O auto-fit só reduz a escala (nunca amplia), normaliza Z e centraliza. Os
offsets são clampados à área útil de 3 mm. Textos longos são reduzidos até
caber.

## Pipeline de geração

`schema.ts` → `autoFit.ts` / `shapes.ts` → `textToGeometry.ts` → `buildCard.ts`
→ `exportStl.ts`, com `svgToIconShape.ts` compartilhado para ícones. O build
roda em Web Worker:

- **main thread** (`useCard.ts`) parseia cada SVG e envia
  `{ params, parsedSvgs, styles }`;
- **worker** carrega as fontes necessárias e chama `buildCard`;
- `workerGeometry.ts` serializa o resultado `{ base, content, contentItems }`;
- `isBuilding` controla “Gerando…” e erros aparecem no overlay; a geometria
  anterior permanece visível durante o rebuild.

O build só depende de geometria (dimensões, cantos e conteúdos); trocar as
cores não reconstrói a peça.

## Editor 2D

`TextPositionEditor` usa SVG com o contorno real do cartão e a área útil
tracejada. As caixas usam `contentItems` reais do build. Suporta arraste
pointer/touch, nudge por setas, seleção, `Escape`, clique no fundo, botão X e
**Concluir**. O foco inicial vai para o botão de fechar.

## Testes

`tests/features/studio/tools/letreiros/cartao-visita/`:

- `schema.test.ts`
- `shapes.test.ts`
- `autoFit.test.ts`
- `textToGeometry.test.ts`
- `buildCard.test.ts`
- `workerGeometry.test.ts`
- `exportStl.test.ts`
- `useCard.test.ts`
- `StudioPanel.test.tsx`
- `TextPositionEditor.test.tsx`

## Fora de escopo

Persistência, geração via CadQuery/Lambda, pagamentos, autenticação, novos
formatos de cartão e cavidade para ímã.
