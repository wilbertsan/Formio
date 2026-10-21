# Design: Relevo vetorial do Rolo de Textura

**Data:** 2026-10-21
**Status:** Aprovado
**Ferramenta:** Studio 3D > Confeitaria > Rolo de Textura

## 1. Objetivo

Substituir o campo de altura rasterizado por relevo **vetorial extrudado e curvado**
sobre o cilindro, replicando a suavidade das formas da ferramenta Carimbo. O relevo
deve ser suave tanto nos motivos internos quanto no SVG personalizado.

## 2. Abordagem (padrão Carimbo)

- O Carimbo usa `THREE.Shape` + `ExtrudeGeometry` (bevel de 0.1mm), une os contornos
  com Clipper e mescla peças fechadas. Não há rasterização.
- No rolo, o mesmo princípio é aplicado sobre um **mapa plano desenrolado** da
  superfície lateral: X = axial, Y = arco. Os motivos são unidos, recortados na
  faixa do corpo, extrudados e **curvados** para o cilindro.
- Corpo e relevo ficam como **cascas fechadas mescladas** (grupos 0 e 1), como no
  carimbo. O STL é imprimível; não é um único sólido conectado.

## 3. Geometria

### Corpo
- Cilindro fechado com tampas planas e filetes de 1mm (`END_FILLET_MM`).
- Gerado por revolução, passo `MESH_STEP_MM = 0.3`; sem campo de altura.
- Fechado: ápices nas tampas, anéis de filete e lateral.

### Relevo
- Células: `cellCols = round(circunferência/célula)`,
  `cellRows = round(comprimento/célula)`; largura/altura exatas.
- Motivos internos vêm de `patterns.ts`; SVG usa `svgRawShapesFromParsed` (formas e
  traço originais) com escala uniforme para 0.88 da célula.
- Stagger de meia célula em linhas ímpares.
- Mapa plano com X em `[-L/2, L/2]` e Y em `[0, circunferência]`.
- Formas que cruzam a emenda são duplicadas em `Y ± circunferência`, unidas e
  recortadas no retângulo `[-L/2 + margem, L/2 - margem] × [0, circunferência]`.
- Extrusão: `ExtrudeGeometry` com profundidade `reliefDepth + EMBED_MM (0.1)`.
  Motivos internos com bevel de `RELIEF_BEVEL_MM = 0.1`; SVG **sem bevel** para
  preservar exatamente o desenho.
- Topo posicionado em `z = reliefDepth`; base embutida no corpo.
- Curvatura: `θ = arc / R`, `raio = R + z`, posição `(x, raio cos θ, raio sin θ)`.
- Normais com `toCreasedNormals(geometry, π/6)` para superfície curva suave e
  arestas de parede nítidas.

## 4. Merge e materiais

- `mergeGeometries([body, relief], true)` gera grupos 0 (corpo) e 1 (relevo).
- Ambos indexados, com `position` e `normal`; UV do relevo removido.
- Preview usa materiais `material-0`/`material-1`; sem `flatShading`.

## 5. Suavidade

- Motivos internos: aumentar segmentos (círculos 48, rosas 96, ondas 96 etc.).
- SVG: `parseSvg(svg, 32)` para curvas mais densas; sem engrossar/dilatar.
- Sem grade de 0.3mm no relevo: o contorno é o vetor.

## 6. Riscos

- Cascas mescladas em vez de sólido único (decisão aprovada).
- Bevel de 0.1mm altera levemente os motivos internos; SVG fica sem bevel.
- Emenda de ondas/chevrons gera parede interna coincidente; slicers resolvem.
- Union/extrusão em densidade alta pode custar ~0.3–1s no worker.
