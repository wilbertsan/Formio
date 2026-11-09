# Ferramenta: Topo de Bolo

## Status

Implementada.

## Objetivo

Gerar toppers decorativos para bolo com múltiplos textos, ícone SVG e fixação por haste simples ou dupla.

## Parâmetros

- Formato: `circle`, `rounded-rect` (padrão), `oval` ou `custom` (contorno definido por SVG)
- Largura: 50–120mm
- Altura: 30–80mm
- Espessura: 2–4mm
- Conteúdo único no painel: 1–3 textos independentes e um ícone SVG opcional
- Textos: cada um com conteúdo (padrão `Texto`), fonte (`normal`/`bold`/`serif`), largura, altura, relevo e offset X/Y próprios
- Largura e altura são independentes: `height` é o tamanho da fonte; `width` é um limite máximo que comprime apenas o eixo X quando excedido, preservando a altura
- Ícone SVG: SVG opcional, escala 0.5–2 e offset X/Y próprio (posicionado livremente no editor 2D)
- Acabamento: sempre relevo alto (texto usa `relief`; ícone usa 1mm)
- Fixação: `haste` (uma haste) ou `haste-dupla` (duas hastes paralelas)
- Hastes: diâmetro 3–8mm, comprimento 20–60mm e ponta cônica proporcional ao diâmetro (plano final de 0,8mm)
- Espaçamento da haste dupla: 10–40mm (padrão 20mm)
- Cores de preview: cor da placa e das letras (10 cores PLA)

## Regras do domínio

- Peça plana com suporte vertical para fixação
- Texto e ícone são sempre gerados em relevo alto; não há modo de corte vazado
- `haste`: haste vertical embutida 2mm na placa, com ponta cônica tipo lápis
- `haste-dupla`: duas hastes verticais paralelas, simétricas em X, cada uma ancorada no fundo local da placa; o espaçamento é ajustável
- Em contornos estreitos ou irregulares, a haste dupla aproxima as hastes; se não houver par válido, usa haste simples e sinaliza o aviso
- Textos encaixados no contorno da placa com margem de 4mm; ícone com margem de 1mm
- Textos e ícone são posicionados livremente no editor 2D; o ícone usa `iconOffsetX`/`iconOffsetY` com margem de 1mm
- Peso leve para não tombar o bolo

## Estrutura de arquivos

- `schema.ts` — Schema Zod, defaults e cores PLA
- `buildCakeTopper.ts` — Geometria da placa, relevo alto (texto + ícone) e hastes cônicas
- `exportStl.ts` — Exportação STL binário (partes mescladas)
- `useCakeTopper.ts` — Hook de estado (reducer + Zod + debounce + fontes lazy)
- `StudioPanel.tsx` — Painel de parâmetros
- `TextPositionEditor.tsx` — Editor 2D de posição de textos e ícone
- `CakeTopperPreview.tsx` — Preview R3F

Helpers compartilhados: `../shared/textOutline.ts` (texto → contornos → geometria),
`../shared/svgToIconShape.ts` (SVG → contornos/ícone), `placement.ts` (contorno e
clamp de posição) e `iconLayout.ts` (dimensões reais do ícone no editor).

## Fora de escopo

Chaveiros, letreiros, backend.
