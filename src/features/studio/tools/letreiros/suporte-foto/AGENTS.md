# Ferramenta: Suporte para Foto

## Status

Implementada — gera e exporta STL localmente no navegador.

## O que faz

Gera suportes de mesa para fotos 10×15, 13×18 e 15×20 cm. A peça é única:
base horizontal, faixa frontal vertical com conteúdo em relevo de 1 mm e painel
inclinado atrás, separado da faixa por uma fenda de 2 mm onde a foto encaixa.

## Parâmetros

| Parâmetro | Tipo | Faixa | Default |
|---|---|---|---|
| photoSize | enum | 10x15, 13x18, 15x20 | 10x15 |
| sideMargin | number | 3–20mm | 10 |
| bandHeight | number | 15–40mm | 25 |
| depth | number | 30–60mm | 40 |
| thickness | number | 2–4mm | 3 |
| angle | number | 60–85° | 75 |
| baseColor / letterColor | enum | 10 cores PLA | teal / white |
| contents[] | array | 1–3 itens | 1 texto |

Cada item de `contents[]` é uma união discriminada por `kind` (`text` | `icon`)
com `id` e `offsetX/Y` (-90–90 / -25–25mm):

- `text`: `content` (string, sem limite, vazio permitido), `fontStyle`
  (normal/bold/serif), `fontSize` (3–15mm)
- `icon`: `svgIcon` (string|null), `iconScale` (0.5–1.0), `iconLineWidth`
  (0.1–1.5mm)

Todos os conteúdos são elevados com `CONTENT_DEPTH = 1`mm e recuados
`CONTENT_MARGIN = 3`mm da faixa. A fenda é fixa em `SLOT_GAP = 2`mm.

## Geometria

- Largura `W = largura da foto + 2 × sideMargin`.
- Perfil lateral único (placa + faixa + fenda + painel inclinado), extrudado na
  largura; sem CSG, portanto manifold por construção.
- Profundidade efetiva = `max(depth, ribBack + PLATE_REAR_MIN)`, com
  `ribBack = thickness + SLOT_GAP + (bandHeight − thickness)/tan(angle) + thickness`
  e `PLATE_REAR_MIN = 2`mm.
- Face do conteúdo em `z = +profundidade/2`, voltada para a câmera.
- A faixa cobre a borda inferior da foto em `bandHeight − thickness`;
  ângulos menores exigem base mais profunda (aviso no painel).

## Arquivos

```
tools/letreiros/suporte-foto/
  schema.ts                 — validação Zod + defaults (contents discriminados)
  shapes.ts                 — perfil lateral, extrusão e medidas derivadas
  autoFit.ts                — área útil da faixa, auto-fit e clamp
  textToGeometry.ts         — TextGeometry + normalização de acentos
  buildPhotoStand.ts        — composição base + conteúdo (merge)
  buildPhotoStand.worker.ts — build em Web Worker
  workerClient.ts           — client do Worker
  workerGeometry.ts         — serialização { base, content, contentItems }
  exportStl.ts              — STL binário + download
  usePhotoStand.ts          — hook: estado + parse SVG + worker + debounce
  StudioPanel.tsx           — painel de parâmetros
  PhotoStandPreview.tsx     — preview R3F com 2 materiais
  PhotoPositionEditor.tsx   — editor 2D da faixa
```

O helper `../../confeitaria/shared/svgToIconShape.ts` é compartilhado para o
parse de SVG, e `../../confeitaria/shared/workerGeometry.ts` para serializar a
geometria. As fontes vêm de `../../chaveiros/chaveiro/fonts.ts`.

## Pipeline de geração

`schema.ts` → `shapes.ts` → `textToGeometry.ts`/`autoFit.ts` →
`buildPhotoStand.ts` → `exportStl.ts`.

- **main thread** (`usePhotoStand.ts`) parseia cada SVG e envia
  `{ params, parsedSvgs, styles }` ao Worker;
- **Worker** carrega as fontes necessárias e chama `buildPhotoStand`;
- `workerGeometry.ts` serializa o resultado de volta;
- `isBuilding` alimenta “Gerando…”, erros aparecem no overlay e a geometria
  anterior permanece visível durante o rebuild;
- trocar cor não reconstrói a peça.

## Editor 2D

`PhotoPositionEditor` usa SVG com a faixa real e a área útil tracejada. As
caixas usam `contentItems` reais do build e são limitadas à área útil. Suporta
arraste pointer/touch, nudge por setas, seleção, `Escape`, clique no fundo,
botão X e **Concluir**. O foco inicial vai para o botão de fechar.

## Testes

`tests/features/studio/tools/letreiros/suporte-foto/`:

- `schema.test.ts`
- `shapes.test.ts`
- `autoFit.test.ts`
- `textToGeometry.test.ts`
- `buildPhotoStand.test.ts`
- `workerGeometry.test.ts`
- `exportStl.test.ts`
- `usePhotoStand.test.ts`
- `StudioPanel.test.tsx`
- `PhotoPositionEditor.test.tsx`

## Fora de escopo

Persistência, geração via CadQuery/Lambda, pagamentos, autenticação, múltiplas
fotos, molduras com janela e peças articuladas.
