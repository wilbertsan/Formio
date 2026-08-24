# Design — Fix do Editor 2D: Inversão Y, Área Válida, Fundo

Data: 2026-08-24
Status: Aprovado (execução direta)

## Problemas

1. Base invertida: pontos da shape com Y matemático (cima) vs SVG Y (baixo)
2. Sem indicador visual da área onde o texto pode ser colocado (borda 4mm)
3. Fundo do SVG sem contraste adequado

## Fixes

1. Inverter Y: flipar pontos da polygon com `y = -y` e ajustar offset no viewBox
2. Área válida: rect semi-transparente com stroke tracejado, margem 4mm da borda + margem do furo
3. Fundo: `bg-neutral-100` no SVG container
