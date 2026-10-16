# Ferramenta: Topo de Bolo

## Status

Implementada.

## Objetivo

Gerar toppers decorativos para bolo com múltiplos textos, ícone SVG e fixação por haste ou base.

## Parâmetros

- Formato: `circle`, `rounded-rect`, `oval` ou `custom` (contorno definido por SVG)
- Largura: 50–120mm
- Altura: 30–80mm
- Espessura: 2–4mm
- Textos: 1–3 itens independentes, cada um com conteúdo, fonte (`normal`/`bold`/`serif`), largura, altura, relevo e offset X/Y próprios
- Ícone SVG: SVG opcional, posição acima ou centro, escala 0.5–2
- Modo de texto: `raised` (relevo) ou `cut` (vazado via CSG com fallback)
- Fixação: `haste` (cilindro integrado) ou `base` (peça separada com encaixe)
- Cores de preview: cor da placa e das letras (10 cores PLA)

## Regras do domínio

- Peça plana com suporte vertical para fixação
- Texto em relevo (`raised`) ou vazado (`cut`) — o vazado usa subtração CSG; se o corte alcançar a borda ou a operação falhar, cai para relevo
- Fixação `haste`: cilindro embutido na placa (corpo único); `base`: peça separada com canaleta de encaixe, impressa ao lado da placa
- Textos encaixados no contorno da placa com margem de 4mm; ícone com margem de 1mm
- Peso leve para não tombar o bolo

## Estrutura de arquivos

- `schema.ts` — Schema Zod, defaults e cores PLA
- `buildCakeTopper.ts` — Geometria da placa, relevo/vazado (CSG), ícone e fixação
- `exportStl.ts` — Exportação STL binário (partes mescladas)
- `useCakeTopper.ts` — Hook de estado (reducer + Zod + debounce + fontes lazy)
- `StudioPanel.tsx` — Painel de parâmetros
- `TextPositionEditor.tsx` — Editor 2D de posição dos textos
- `CakeTopperPreview.tsx` — Preview R3F

Helpers compartilhados: `../shared/textOutline.ts` (texto → contornos → geometria)
e `../shared/svgToIconShape.ts` (SVG → contornos/ícone).

## Fora de escopo

Chaveiros, letreiros, backend.
