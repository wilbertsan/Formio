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
- Texto elevado ou gravado (relevo 0.4–2mm)
- Argola reforçada: anel extrudado ao redor do furo
- Margem mínima entre texto e borda: 4mm
- Formato: retangular, circular ou coração
- STL sempre manifold, fechado, pronto para impressão

## Invariantes

- 1 unidade Three.js = 1 mm
- Schema Zod valida todos os parâmetros
- Build retorna `{ base, text }` para preview com cores separadas
- Export STL binário mergeando base + texto
- Posicionamento de texto por editor 2D (arrastar + snap de contato)

## Fora de escopo

Confeitaria, letreiros, landing, backend.
