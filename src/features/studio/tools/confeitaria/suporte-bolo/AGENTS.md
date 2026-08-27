# Ferramenta: Suporte de Bolo

## Status

Implementada.

## Objetivo

Gerar suportes/stands para exibir bolo com decoração personalizada.

## Parâmetros

- Diâmetro da base: 80–200mm (padrão: 150mm)
- Altura predefinida: baixo (40mm), médio (60mm), alto (80mm)
- Espessura: 3–6mm (padrão: 4mm)
- Prato com borda: true/false (padrão: true)
- Altura da borda: 5–15mm (padrão: 8mm)
- Decoração da base: nenhuma, hexágonos, linhas, ondas (padrão: hexágonos)
- Cor do PLA: 10 cores disponíveis

## Estrutura

- `schema.ts` - Validação Zod e tipos
- `buildCakeStand.ts` - Geração de geometria
- `useCakeStand.ts` - Hook de estado
- `StudioPanel.tsx` - Painel de parâmetros
- `CakeStandPreview.tsx` - Preview 3D

## Regras do domínio

- Estabilidade: base larga e centro de gravidade baixo
- Coluna cônica para suporte estrutural
- Superfície plana para apoio do bolo
- 1 unidade Three.js = 1 mm

## Fora de escopo

Chaveiros, letreiros, backend.
