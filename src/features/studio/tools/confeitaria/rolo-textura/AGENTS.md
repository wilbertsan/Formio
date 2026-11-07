# Ferramenta: Rolo de Textura

## Status

Implementada.

## Objetivo

Gerar rolos de textura em relevo para marcar massas, fondant, biscoitos e doces.
A peça é um **cilindro fechado, sem cabos laterais**, com tampas planas e filetes
de borda, pronto para uso, com um padrão repetido em toda a superfície de contato.

## Parâmetros

- Comprimento do rolo: 50–150mm (padrão: 100mm)
- Diâmetro do rolo: 20–40mm (padrão: 30mm)
- Extremidades: tampas planas com filete de 1mm (`END_FILLET_MM`); sem cabos laterais
- Família de padrão: `geometric`, `wave`, `floral` (3 motivos por família)
- Motivo do padrão: `diamonds`, `dots`, `grid`; `waves`, `chevrons`, `scales`;
  `flower`, `leaf`, `rosette`
- Origem do padrão: `patternSource` `motif` (motivo interno) ou `svg` (SVG
  personalizado, repetido como motivo; traços finos são engrossados até 0,8mm)
- Profundidade do relevo: 0.5–2mm (padrão: 1mm)
- Escala do padrão: 40–100% (padrão: 100%)
- Densidade do padrão: `low`, `medium`, `high` (células de 12/8/5mm;
  padrão: `medium`)
- Cores de preview: cor do rolo e cor do relevo (10 cores PLA)

## Regras do domínio

- Contato com alimento: arestas arredondadas, sem furos internos que prendam massa
- Relevo **somente externo (saliente)** — sem modo gravado
- Corpo e relevo são cascas fechadas mescladas em grupos 0 (corpo) e 1 (relevo);
  sem operações booleanas
- Sem cabos/eixos laterais: o comprimento total é igual ao comprimento do rolo
- Relevo vetorial extrudado e curvado sobre o cilindro; sem rasterização
- Escala uniforme por `min(cellW, cellH)`; motivos e SVG não são esticados
- Mínimo de 0,8mm aplicado por dilatação/deficit nos motivos e por engrossamento
  de traço no SVG (sem alterar a centerline)
- Motivos contínuos (`waves`, `chevrons`) ultrapassam a célula em X para emendar
  entre colunas
- SVG sem chanfro para preservar o traço; motivos internos com chanfro de 0,2mm
- Furos de motivos podem reduzir em escalas pequenas para manter a parede mínima
- Periodicidade exata do padrão em 360° e ao longo do comprimento, sem costura
  nem overlap (número de repetições arredondado)
- Chanfro do relevo: 0.2mm
- Resolução da malha do corpo: 0.3mm (`MESH_STEP_MM`)
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
├── patterns.ts                  # 9 motivos + espessura mínima por motivo
├── reliefLayout.ts              # Grade, escala uniforme, mínimo, repetição e recorte
├── buildTextureRoller.ts        # Orquestração corpo + relevo
├── buildTextureRoller.worker.ts # Build em Web Worker
├── workerClient.ts              # Interface tipada do worker (request/response)
├── workerGeometry.ts            # Serialização da geometria para o worker
├── useTextureRoller.ts          # Hook de estado (reducer + Zod + debounce + worker)
├── StudioPanel.tsx              # Painel de parâmetros (Padrão / Dimensões / Aparência)
├── TextureRollerPreview.tsx     # Preview R3F
└── exportStl.ts                 # Exportação STL binário
```

Helpers compartilhados: `../shared/textOutline.ts` (união/offset de contornos e
conversão de paths), `../shared/svgToIconShape.ts` (parse e contornos a partir
de SVG) e `../shared/svgPattern.ts` (SVG → motivo com escala e traço mínimo).

## Integração

- `ToolSelector.tsx`: `rolo-textura` no `ToolId` e card na categoria Confeitaria
- `StudioPage.tsx`: `React.lazy` para painel e preview, hook/`exportStl` e
  `RoloTexturaToolWrapper`

## Testes implementados

`tests/features/studio/tools/confeitaria/rolo-textura/`:

- `schema.test.ts`
- `patterns.test.ts`
- `reliefLayout.test.ts`
- `buildBody.test.ts`
- `buildRelief.test.ts`
- `buildTextureRoller.test.ts`
- `workerGeometry.test.ts`
- `useTextureRoller.test.ts`
- `exportStl.test.ts`
- `StudioPanel.test.tsx`
- `TextureRollerPreview.test.tsx`

## Fora de escopo

Chaveiros, letreiros, backend.
