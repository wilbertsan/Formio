# Ferramenta: Rolo de Textura

## Status

Implementada.

## Objetivo

Gerar rolos de textura em relevo para marcar massas, fondant, biscoitos e doces.
A peça é um **cilindro único com eixo/cabos integrados**, pronto para uso, com um
padrão repetido em toda a superfície de contato.

## Parâmetros

- Comprimento do rolo: 50–150mm (padrão: 100mm)
- Diâmetro do rolo: 20–40mm (padrão: 30mm)
- Cabos: integrados nas extremidades, fixos em Ø8mm × 25mm, com pontas
  hemisféricas e filete de 2mm na transição com o corpo
- Família de padrão: `geometric`, `wave`, `floral` (3 motivos por família)
- Motivo do padrão: `diamonds`, `dots`, `grid`; `waves`, `chevrons`, `scales`;
  `flower`, `leaf`, `rosette`
- Origem do padrão: `patternSource` `motif` (motivo interno) ou `svg` (SVG
  personalizado, repetido como motivo)
- Profundidade do relevo: 0.5–2mm (padrão: 1mm)
- Densidade do padrão: `low`, `medium`, `high` (células de 12/8/5mm;
  padrão: `medium`)
- Cores de preview: cor do rolo e cor do relevo (10 cores PLA)

## Regras do domínio

- Contato com alimento: arestas arredondadas, sem furos internos que prendam massa
- Relevo **somente externo (saliente)** — sem modo gravado
- Malha única manifold (corpo + cabos) gerada por revolução; sem booleans
- Relevo gerado por **campo de altura** sobre a superfície do cilindro
- Periodicidade exata do padrão em 360° e ao longo do comprimento, sem costura
  nem overlap (número de repetições arredondado)
- Chanfro do relevo: 0.2mm
- Traço mínimo de relevo: 0.8mm (evita fusão no FDM)
- Margem axial nas extremidades do corpo: 1mm
- Profundidade mínima imprimível: 0.5mm (FDM)
- STL sempre manifold, fechado, sem auto-interseções
- 1 unidade Three.js = 1mm

## Estrutura de arquivos

```
src/features/studio/tools/confeitaria/rolo-textura/
├── AGENTS.md
├── schema.ts                    # Schema Zod, constantes, defaults e cores PLA
├── patterns.ts                  # 9 motivos por família (geométrico, ondulado, floral)
├── buildTextureRoller.ts        # Campo de altura + malha de revolução (corpo + cabos + relevo)
├── buildTextureRoller.worker.ts # Build em Web Worker
├── workerClient.ts              # Interface tipada do worker (request/response)
├── workerGeometry.ts            # Serialização da geometria para o worker
├── useTextureRoller.ts          # Hook de estado (reducer + Zod + debounce + worker)
├── StudioPanel.tsx              # Painel de parâmetros (Padrão / Dimensões / Aparência)
├── TextureRollerPreview.tsx     # Preview R3F
└── exportStl.ts                 # Exportação STL binário
```

Helpers compartilhados: `../shared/textOutline.ts` (união/offset de contornos e
conversão de paths) e `../shared/svgToIconShape.ts` (parse e contornos a partir
de SVG).

## Integração

- `ToolSelector.tsx`: `rolo-textura` no `ToolId` e card na categoria Confeitaria
- `StudioPage.tsx`: `React.lazy` para painel e preview, hook/`exportStl` e
  `RoloTexturaToolWrapper`

## Testes implementados

`tests/features/studio/tools/confeitaria/rolo-textura/`:

- `schema.test.ts`
- `patterns.test.ts`
- `buildHeightField.test.ts`
- `buildTextureRoller.test.ts`
- `workerGeometry.test.ts`
- `useTextureRoller.test.ts`
- `exportStl.test.ts`
- `StudioPanel.test.tsx`
- `TextureRollerPreview.test.tsx`

## Fora de escopo

Chaveiros, letreiros, backend.
