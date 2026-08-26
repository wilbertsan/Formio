# Ferramenta: Chaveiro 3D

## Status

Implementada — gera e exporta STL localmente no navegador.

## O que faz

Gera chaveiros 3D personalizados com texto elevado ou gravado, argola reforçada e cores PLA.

## Parâmetros

| Parâmetro | Tipo | Faixa | Default |
|---|---|---|---|
| textMode | enum | raised, engraved | raised |
| baseShape | enum | rect, circle, heart | rect |
| width | number | 20–80mm | 50 |
| borderWidth | number | 4–10mm | 4 |
| thickness | number | 2–6mm | 3 |
| ringPosition | enum | top, bottom, left, right | top |
| ringInnerDiameter | number | 3–10mm | 5 |
| ringEmbedding | number | 0–3mm | 0 |
| baseColor / letterColor | enum | 10 cores PLA | teal / white |
| texts[] | array | 1–3 itens | 1 ("Meu nome") |

Cada TextItem: `id, content (1-12 chars), fontStyle (normal/bold/serif), width, height, relief, proportional, offsetX/Y`

## Arquivos

```
tools/chaveiros/chaveiro/
  schema.ts             — validação Zod + defaults
  shapes.ts             — Three.js Shape + furo + argola
  textToGeometry.ts     — TextGeometry + fit-to-width
  buildKeychain.ts      — composição base + texto (merge/CSG)
  positioning.ts        — clamp de borda/furo, empilhamento
  exportStl.ts          — STL binário + download
  fonts.ts              — mapa estilo → typeface.json
  useKeychain.ts        — hook: estado + fontes lazy + debounce
  StudioPanel.tsx       — painel de parâmetros
  KeychainPreview.tsx   — preview R3F com 2 materiais
  TextPositionEditor.tsx — editor 2D SVG de posicionamento
```

## Pipeline de geração

`schema.ts` → `shapes.ts` → `textToGeometry.ts` → `buildKeychain.ts` → `exportStl.ts`

## Testes

`tests/features/studio/tools/chaveiros/chaveiro/` — 9 arquivos, 78 testes.

## Fora de escopo

Persistência, geração via CadQuery/Lambda, pagamentos, autenticação.
