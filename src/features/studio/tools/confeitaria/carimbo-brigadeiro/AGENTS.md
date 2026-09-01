# Ferramenta: Carimbo para Brigadeiro

## Status

Implementada.

## Objetivo

Gerar carimbos para marcar brigadeiros e doces com textos ou formatos.

## Parâmetros

- Texto: conteúdo (1-30 chars), estilo da fonte (normal/bold/serif), tamanho (6-15mm)
- Formato: diâmetro (10-30mm), altura (15-25mm)
- Ícone SVG: upload opcional, escala (0.5-2.0x)
- Relevo: tipo (negativo/positivo)
- Aparência: cor da base, cor do relevo (10 cores PLA)

## Regras do domínio

- Relevo negativo (o que é gravado aparece no doce)
- Superfície plana de contato
- Altura mínima para grip durante uso
- Base para não marcar a superfície de apoio

## Arquivos

- `schema.ts` — Schema Zod + tipos + constantes
- `buildStamp.ts` — Geração de geometria (base, handle, texto, ícone)
- `StampPreview.tsx` — Componente R3F para preview
- `StudioPanel.tsx` — Painel de parâmetros (5 seções accordion)
- `useStamp.ts` — Hook de estado + debounce
- `exportStampStl.ts` — Exportação STL binário

## Fora de escopo

Chaveiros, letreiros, backend.
