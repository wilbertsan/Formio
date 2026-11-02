# Categoria: Chaveiros

Itens pequenos e finos com furo/argola para pendurar — chaveiros e marcadores.

## Ferramentas

| Ferramenta | Status |
|---|---|
| chaveiro | implementada |
| marcador-pagina | planejada |

## Regras do domínio

- Espessura típica: 2–6mm
- Furo para argola: diâmetro interno 3–10mm, margem mínima de 2mm da borda
- Texto ou ícone SVG sempre elevado em 1mm
- Conteúdo 1–3 itens (texto ou ícone SVG), com upload de SVG e auto-fit por formato
- Argola reforçada: anel extrudado ao redor do furo
- Margem mínima entre conteúdo e borda: 4mm
- Formato: retangular, circular, coração ou contorno do nome
- STL sempre manifold, fechado, pronto para impressão

## Invariantes

- 1 unidade Three.js = 1 mm
- Schema Zod valida todos os parâmetros
- Build retorna `{ base, content, contentItems }` para preview com cores separadas
- Export STL binário mergeando base + conteúdo
- Posicionamento de conteúdo por editor 2D

## Fora de escopo

Confeitaria, letreiros, landing, backend.
