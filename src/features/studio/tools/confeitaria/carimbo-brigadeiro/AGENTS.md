# Ferramenta: Carimbo para Brigadeiro

## Status

Implementada.

## Objetivo

Gerar carimbos para marcar brigadeiros e doces com textos ou formatos.

## Parâmetros

- Conteúdo: **texto ou ícone SVG** (mutuamente exclusivos)
- Texto: conteúdo (1-30 chars), estilo da fonte (normal/bold/serif), tamanho desejado (6-15mm)
- Ícone SVG: upload, escala relativa ao encaixe (0.5-1.0x), espessura da linha (0.1-1.5mm)
- Elevação do relevo: altura que o conteúdo sobressai (0.5-3.0mm, padrão 1.0mm), para texto e ícone
- Formato: diâmetro (10-30mm), altura (15-25mm)
- Aparência: cor da base, cor do relevo (10 cores PLA)

## Regras do domínio

- Relevo saliente: o conteúdo sobressai abaixo da face de contato e grava o doce; a altura é controlada por `reliefElevation`
- Superfície plana de contato
- Corpo único em hiperboloide com cintura central (visual de duas folhas): face de contato plana (diâmetro) em `z=0`, cintura em `z=altura/2` com raio `max(2.5, 0.18·diâmetro)` e topo em `z=altura` com raio `max(cintura+0.5, 0.3·diâmetro)`. Imprime com a face para cima (overhang ≲ 45°)
- Altura mínima para grip durante uso
- Base para não marcar a superfície de apoio
- Texto e ícone são auto-ajustados (X/Y) para caber no círculo do carimbo, respeitando a margem `CONTENT_MARGIN_MM`; o relevo (Z) não é escalado. O ícone encaixa pelo vértice mais distante do centro (não pela bounding box), aproveitando melhor a área
- O ícone SVG é girado 180° no eixo Z — o SVGLoader entrega Y para baixo, o que deixaria o ícone de cabeça para baixo
- Traços finos do SVG são engrossados até `iconLineWidth` (0.1–1.5mm, padrão 0.3mm) para serem imprimíveis. Como o SVGLoader não extrusa `stroke`, paths de linha viram contorno sólido via Clipper; fills são dilatados na mesma espessura

## Arquivos

- `schema.ts` — Schema Zod + tipos + constantes
- `buildStamp.ts` — Geração de geometria (corpo em hiperboloide, texto, ícone)
- `StampPreview.tsx` — Componente R3F para preview
- `StudioPanel.tsx` — Painel de parâmetros (3 seções accordion)
- `useStamp.ts` — Hook de estado + debounce
- `exportStampStl.ts` — Exportação STL binário

## Fora de escopo

Chaveiros, letreiros, backend.
