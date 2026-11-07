# Design: Fidelidade e escala do relevo do Rolo de Textura

**Data:** 2026-11-07
**Status:** Aprovado
**Ferramenta:** Studio 3D > Confeitaria > Rolo de Textura

## 1. Objetivo

Reconstruir somente o **relevo** do Rolo de Textura para corrigir dois defeitos:

1. O motivo e o SVG são esticados de forma não uniforme, porque a célula usa
   `cellW` no arco e `cellH` no axial, e esses valores diferem por arredondamento.
2. O traço mínimo de `0,8 mm` (`MIN_FEATURE_MM`) existe no schema, mas não era
   aplicado em nenhum ponto do build.

O corpo, as tampas, o worker, a serialização, o preview e a exportação não mudam.

## 2. Parâmetros

- Novo `patternScale`: `0,4–1,0`, padrão `1,0`.
- No painel aparece como **“Escala do padrão” 40–100%**, no acordeão Padrão.
- Motivos internos: escala linear = `min(cellW, cellH) × patternScale`.
- SVG: escala-alvo = `SVG_FILL_RATIO (0,88) × min(cellW, cellH) × patternScale`.
- `MIN_FEATURE_MM = 0,8` passa a ser usado de fato.
- Células continuam em 12/8/5 mm (`DENSITY_CELL_MM`).

## 3. Escala uniforme

- `cellCols = max(3, round(circunferência / cellMm))`
- `cellRows = max(2, round(comprimento / cellMm))`
- `cellW = circunferência / cellCols`
- `cellH = comprimento / cellRows`
- `cellSpan = min(cellW, cellH)`

A escala usa `cellSpan` nos dois eixos. Isso elimina a distorção. Como
`cellSpan ≤ cellW`, motivos contínuos (ondas e chevrons) são desenhados com
pequena sobreposição em X (`[-0,55, 0,55]`) para garantir emenda entre colunas
mesmo quando `cellW > cellSpan`.

## 4. Mínimo de 0,8 mm nos motivos internos

Cada motivo declara `minThickness` em unidades de célula (espessura local mais
fina). No layout:

- `motifSpan` = maior dimensão do bounding box do motivo.
- `baseScale = cellSpan × patternScale`.
- Se `minThickness × baseScale ≥ 0,8`, não há dilatação.
- Caso contrário, o motivo é reduzido e dilatado para manter o tamanho externo
  e garantir a espessura:

```
outer = baseScale × motifSpan
scale = (outer − MIN_FEATURE_MM) / (motifSpan − minThickness)
dilation = (MIN_FEATURE_MM − minThickness × scale) / 2
```

O resultado é `motifSpan × scale + 2 × dilation = outer` e a feature mais fina
mede exatamente `0,8 mm`. Quando `motifSpan ≈ minThickness` (círculos), usa-se
`scale = max(baseScale, MIN_FEATURE_MM / motifSpan)` sem dilatação.

Depois de escalado, o motivo é convertido em paths de Clipper em mm e recebe
`offsetPaths(paths, dilation)` antes da repetição.

## 5. Fidelidade e mínimo no SVG

- Traços usam a centerline original e largura
  `max(larguraDeclarada × scale, MIN_FEATURE_MM)`. Nada além da espessura muda.
- Preenchimentos são testados por componente com recuo de `MIN_FEATURE_MM / 2`.
  Componente que desaparece é fino e recebe dilatação de `MIN_FEATURE_MM / 2`;
  componente que sobrevive fica intacto.
- O encaixe reserva o espaço da dilatação e do traço máximo antes de calcular a
  escala, para o SVG continuar dentro da célula.
- A escala é uniforme pelo maior lado do bounding box, preservando proporção,
  furos e orientação (Y do SVGLoader invertido).
- A união via Clipper continua apenas para resolver sobreposições e
  auto-interseções.
- SVG permanece **sem chanfro**; motivos internos mantêm chanfro de 0,2 mm.

## 6. Emenda e recorte

- Cada motivo é replicado em todas as células.
- Cópias deslocadas em `Y ± circunferência` são unidas antes do recorte.
- Recorte em `[-comprimento/2 + margem, comprimento/2 − margem] × [0, circunferência]`,
  com `margem = max(EDGE_MARGIN_MM, END_FILLET_MM) = 1 mm`.
- Stagger de meia célula em linhas ímpares permanece igual.

## 7. Arquitetura

```
rolo-textura/
├── schema.ts              # + patternScale, PATTERN_FILL_RATIO, MIN_FEATURE_MM usado
├── patterns.ts            # + MOTIF_MIN_THICKNESS; ondas/chevrons com overlap em X
├── reliefLayout.ts        # NOVO: grade, escala, dilatação, repetição, emenda e recorte
├── buildRelief.ts         # orquestra layout + SVG + extrusão + curvatura
├── buildTextureRoller.ts  # inalterado
├── buildTextureRoller.worker.ts # inalterado (recebe patternScale no payload)
├── StudioPanel.tsx        # + slider de escala
├── useTextureRoller.ts    # + patternScale em buildParams/clamp/deps
└── ...
shared/svgPattern.ts       # + svgPatternShapes(parsed, { targetSpan, minFeatureMm })
```

O helper local de SVG do rolo é removido. `patterns.ts` continua com os 9
motivos; só ganha metadados de espessura mínima e o overlap dos contínuos.

## 8. Testes

- `schema.test.ts`: `patternScale` válido, default e limites.
- `patterns.test.ts`: todos os motivos têm `minThickness > 0`; ondas/chevrons
  cobrem `[-0,55, 0,55]` e continuam alinhados nas bordas.
- `reliefLayout.test.ts` (novo):
  - escala uniforme quando `cellW ≠ cellH`;
  - `patternScale` reduz o motivo;
  - mínimo de 0,8 mm em densidade alta + escala baixa;
  - stagger, emenda e recorte.
- `buildRelief.test.ts`:
  - SVG circular não vira elipse;
  - traço de 0,02 mm sai com ≥ 0,8 mm;
  - preenchimento fino engrossa, preenchimento sólido não;
  - topo em `R + profundidade`, sem NaN.
- `StudioPanel.test.tsx`: slider “Escala do padrão” presente e dispara update.
- `useTextureRoller.test.ts`: `patternScale` entra no payload e dispara rebuild.
- `shared/svgPattern` (teste existente ou novo): proporção e mínimo de traço.

## 9. Riscos

- Dilatação altera levemente a forma; mitigada aplicando só quando necessário e
  mantendo o tamanho externo.
- SVG denso pode custar tempo no Clipper; permanece no Web Worker.
- Em escalas pequenas, o mínimo de 0,8 mm limita o efeito visual; o painel
  explica no texto de apoio.
- O overlap dos motivos contínuos aumenta a área unida; o recorte e a união
  absorvem a sobra.

## 10. Fora de escopo

Corpo, tampas, cabos, worker, preview, exportação, cores, novos motivos além do
ajuste de espessura mínima, novas famílias e persistência.
