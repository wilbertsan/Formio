# Ferramenta: Carimbo para Brigadeiro

## Status

Implementada.

## Objetivo

Gerar carimbos para marcar brigadeiros e doces com textos ou formatos.

## Parâmetros

- Conteúdo: **texto ou ícone SVG** (mutuamente exclusivos)
- Texto: conteúdo (1-30 chars), estilo da fonte (normal/bold/serif), tamanho desejado (6-15mm)
- Ícone SVG: upload, escala relativa ao encaixe (0.5-1.0x), espessura da linha (0.1-1.5mm)
- Formato: diâmetro (10-30mm), altura (15-25mm)
- Relevo: tipo (negativo/positivo)
- Aparência: cor da base, cor do relevo (10 cores PLA)

## Regras do domínio

- Relevo negativo (o que é gravado aparece no doce)
- Superfície plana de contato
- Altura mínima para grip durante uso
- Base para não marcar a superfície de apoio
- Texto e ícone são auto-ajustados (X/Y) para caber no círculo do carimbo, respeitando a margem `CONTENT_MARGIN_MM`; o relevo (Z) não é escalado. O ícone encaixa pelo vértice mais distante do centro (não pela bounding box), aproveitando melhor a área
- O ícone SVG é girado 180° no eixo Z — o SVGLoader entrega Y para baixo, o que deixaria o ícone de cabeça para baixo
- Traços finos do SVG são engrossados até `iconLineWidth` (0.1–1.5mm, padrão 0.3mm) para serem imprimíveis. Como o SVGLoader não extrusa `stroke`, paths de linha viram contorno sólido via Clipper; fills são dilatados na mesma espessura

## Arquivos

- `schema.ts` — Schema Zod + tipos + constantes
- `buildStamp.ts` — Geração de geometria (base, handle, texto, ícone)
- `StampPreview.tsx` — Componente R3F para preview
- `StudioPanel.tsx` — Painel de parâmetros (4 seções accordion)
- `useStamp.ts` — Hook de estado + debounce
- `exportStampStl.ts` — Exportação STL binário

## Fora de escopo

Chaveiros, letreiros, backend.
