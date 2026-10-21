# Design: Rolo de Textura

**Data:** 2026-10-19
**Status:** Aprovado
**Ferramenta:** Studio 3D > Confeitaria > Rolo de Textura

> **Revisão (2026-10-21):** cabos/eixos laterais removidos. O rolo é um cilindro
> fechado com tampas planas e filetes de 1mm; o comprimento total é igual a `length`.

## 1. Objetivo

Gerar rolos de textura em relevo para marcar massas, fondant, biscoitos e doces.
A peça é um cilindro fechado, sem cabos laterais, com tampas planas e filetes de
borda, pronto para uso, com padrão repetido em toda a superfície de contato.

## 2. Parâmetros

- Comprimento do rolo: 50–150 mm (padrão 100)
- Diâmetro do rolo: 20–40 mm (padrão 30)
- Extremidades: tampas planas com filete de 1 mm (`END_FILLET_MM`); sem cabos laterais
- Família de padrão: `geometric`, `wave`, `floral`
- Motivo do padrão: 3 por família
  - geometric: `diamonds`, `dots`, `grid`
  - wave: `waves`, `chevrons`, `scales`
  - floral: `flower`, `leaf`, `rosette`
- Padrão personalizado: SVG opcional (`patternSource: 'svg'`), repetido como motivo
- Profundidade do relevo: 0.5–2 mm (padrão 1)
- Densidade: `low` (célula 12 mm), `medium` (8 mm), `high` (5 mm)
- Cores: cor do rolo e cor do relevo (10 cores PLA)

## 3. Geometria

- Eixo do rolo em X; corpo em `[-L/2, L/2]`, com tampas planas e filete de 1 mm.
- O rolo é **uma única malha fechada** por revolução do perfil amostrado, com
  deslocamento radial dado por um **campo de altura** aplicado na lateral do corpo.
- `h(θ,x)` vem de uma máscara rasterizada dos motivos: `nCols = round(2πR/célula)` e
  `nRows = round(L/célula)` garantem fechamento exato em 360° e no comprimento.
- Chanfro `RELIEF_BEVEL_MM = 0.2` via transformada de distância assinada → arestas
  arredondadas (contato com alimento), manifold, sem costura.
- Margem axial de 1 mm em cada ponta do corpo para o relevo zerar antes do filete.
- Passo de malha `MESH_STEP_MM = 0.5`; traço mínimo `MIN_FEATURE_MM = 0.8`.
- Cores por grupos de material: grupo 0 = corpo, grupo 1 = relevo.

## 4. Decisões

- Abordagem de malha de altura contínua (aprovada) em vez de peças extrudadas
  separadas (cascas sobrepostas) ou união booleana (CSG lenta/frágil).
- Build puro em Web Worker; SVG parseado na main thread (`parseSvg`) e passado
  achatado, como em `cortador-carimbo`.
- Motivos contínuos (`waves`, `chevrons`) tocam as bordas da célula em X para
  emendar entre colunas; demais respeitam folga.
- SVG normalizado a 88% da célula, preservando proporção, e repetido.

## 5. Estrutura de arquivos

```
src/features/studio/tools/confeitaria/rolo-textura/
├── AGENTS.md
├── schema.ts
├── patterns.ts
├── buildTextureRoller.ts
├── buildTextureRoller.worker.ts
├── workerGeometry.ts
├── workerClient.ts
├── useTextureRoller.ts
├── StudioPanel.tsx
├── TextureRollerPreview.tsx
└── exportStl.ts
```

Helpers compartilhados: `../shared/textOutline.ts` e `../shared/svgToIconShape.ts`.

## 6. Riscos

- Winding/normal da malha: validar com teste de malha fechada e ajustar ordem.
- Chanfro suaviza quinas (aceitável para FDM e contato com alimento).
- SVG muito denso: normalização + `MIN_FEATURE_MM` no parse.
- Performance: ~90k vértices no pior caso (D40/L150), rodando em worker.
