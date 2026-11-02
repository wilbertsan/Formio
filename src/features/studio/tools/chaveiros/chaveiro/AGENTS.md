# Ferramenta: Chaveiro 3D

## Status

Implementada — gera e exporta STL localmente no navegador.

## O que faz

Gera chaveiros 3D personalizados com texto ou ícone SVG elevado ou gravado, argola reforçada e cores PLA.

## Parâmetros

| Parâmetro | Tipo | Faixa | Default |
|---|---|---|---|
| textMode | enum | raised, engraved | raised |
| baseShape | enum | rect, circle, heart, name | rect |
| width | number | 20–80mm | 50 |
| height | number | 20–80mm | 25 |
| borderWidth | number | 4–10mm | 4 |
| thickness | number | 2–6mm | 3 |
| ringPosition | enum | top, bottom, left, right | top |
| ringInnerDiameter | number | 3–10mm | 5 |
| ringEmbedding | number | 0–3mm | 0 |
| ringLateralOffset | number | -10–10mm | 0 |
| ringRadialOffset | number | 0–5mm | 0 |
| baseColor / letterColor | enum | 10 cores PLA | teal / white |
| reliefDepth | number | 0.4–2mm | 1 |
| contents[] | array | 1–3 itens | 1 ("Meu nome") |

Cada item de `contents[]` é uma união discriminada por `kind` (`text` | `icon`) com `id`, `offsetX/Y` (-20–20mm) em comum:

- `text`: `content` (1–12 chars), `fontStyle` (normal/bold/serif), `fontSize` (6–15mm)
- `icon`: `svgIcon` (string|null), `iconScale` (0.5–1.0), `iconLineWidth` (0.1–1.5mm)

`reliefDepth` é global (substitui o relevo por item) e `textMode` continua global.

### Formato 'name' (Contorno do Nome)

Quando `baseShape === 'name'`:
- A base do chaveiro é a união dos contornos de todos os textos e ícones
- Sliders de Comprimento/Altura ocultos (tamanho controlado por `fontSize` do texto e `iconScale` do ícone)
- `borderWidth` dilata o contorno da união (não é espessura por letra)
- `textMode` (raised/engraved) controla o preenchimento sobre o contorno
- Argola posicionada conforme `ringPosition` em relação à bounding box da união, recuada por margem + raio + `ringRadialOffset` + `ringEmbedding`; `ringLateralOffset` desloca ao longo da borda

## Arquivos

```
tools/chaveiros/chaveiro/
  schema.ts             — validação Zod + defaults (contents discriminados)
  autoFit.ts            — região útil por formato + auto-fit + folga do furo
  shapes.ts             — Three.js Shape + furo + argola
  textToGeometry.ts     — TextGeometry + normalização de nome
  nameOutline.ts        — união/expansão de contornos para formato 'name'
  buildKeychain.ts      — composição base + conteúdo (merge/CSG)
  positioning.ts        — clamp de borda/furo, empilhamento
  exportStl.ts          — STL binário + download
  fonts.ts              — mapa estilo → typeface.json
  useKeychain.ts        — hook: estado + fontes lazy + debounce
  StudioPanel.tsx       — painel de parâmetros
  KeychainPreview.tsx   — preview R3F com 2 materiais
  TextPositionEditor.tsx — editor 2D SVG de posicionamento
```

`autoFit.ts` define a região útil de cada formato e ajusta o conteúdo:

- `rect` — retângulo interno recuado por `borderWidth`
- `circle` — círculo de raio `width / 2 - borderWidth`
- `heart` — círculo inscrito no coração menos `borderWidth`
- `name` — sem região própria: a base é o próprio contorno dos conteúdos

O auto-fit só reduz a escala (nunca amplia). Depois do encaixe, `clampTextPosition` mantém `TEXT_BORDER_MIN` (4mm) das bordas e folga de 1mm do furo da argola.

O helper `../../confeitaria/shared/svgToIconShape.ts` é compartilhado para parse de SVG, bounds, escala, engrossamento de traço e geometria de ícone.

## Pipeline de geração

`schema.ts` → `autoFit.ts`/`shapes.ts` → `textToGeometry.ts` → `buildKeychain.ts` → `exportStl.ts`, com `svgToIconShape.ts` compartilhado para ícones.

## Testes

`tests/features/studio/tools/chaveiros/chaveiro/` — 11 arquivos, 171 testes:

- `autoFit.test.ts`
- `buildKeychain.test.ts`
- `exportStl.test.ts`
- `nameOutline.test.ts`
- `positioning.test.ts`
- `schema.test.ts`
- `shapes.test.ts`
- `textToGeometry.test.ts`
- `useKeychain.test.tsx`
- `StudioPanel.test.tsx`
- `TextPositionEditor.test.tsx`

## Fora de escopo

Persistência, geração via CadQuery/Lambda, pagamentos, autenticação.
