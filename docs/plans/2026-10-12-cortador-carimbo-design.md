# Design: Cortador + Carimbo (reformulado)

**Data:** 2026-10-12
**Status:** Aprovado e implementado
**Ferramenta:** Studio 3D > Confeitaria > Cortador + Carimbo

---

## 1. Visão Geral

A ferramenta gera **duas peças separadas em um único STL**, lado a lado na mesa:

1. **Cortador** — parede simples no formato escolhido, tipo cortador de biscoito (tubo fechado, sem relevo).
2. **Carimbo** — base no mesmo formato do cortador, dimensionada para caber dentro da abertura do corte, com cabo e conteúdo em relevo positivo.

Uso: corta a massa com o cortador, pressiona o carimbo dentro da marca.

## 2. Motivação

A versão anterior era uma peça única (parede com furo + relevo interno) e apresentava: relevo flutuante/solto, parede ruim, conteúdo que não cabia e geometria não-manifold. O conceito de duas peças elimina o relevo interno e torna cada peça imprimível e previsível.

## 3. Decisões

| Decisão | Escolha |
|---|---|
| Conceito | Duas peças separadas |
| Peça do carimbo | Base + cabo (como carimbo-brigadeiro) |
| Peça do cortador | Parede simples (cortador de biscoito) |
| Base do carimbo | Mesmo formato do cortador |
| Entrega | Um STL com peças lado a lado |
| Conteúdo | Texto OU ícone SVG (mutuamente exclusivos) |
| Tamanho do carimbo | Derivado do corte (folga fixa) |
| Relevo | Somente positivo, sobreposição (sem booleano) |
| Painel | Por peça: Cortador / Carimbo / Aparência |
| Cores | Cor do cortador + cor do carimbo |
| Fixos | Folga 0.4mm, relevo 1mm, cabo 60% |
| Helper SVG | Extraído para `shared/svgToIconShape.ts` |

## 4. Schema de Parâmetros

```typescript
cutterStampParamsSchema = z.object({
  productType: z.literal('cutter-stamp'),
  outerShape: z.enum(['circle', 'rectangle', 'star']),
  diameter: z.number().min(30).max(80),
  rectWidth: z.number().min(30).max(80),
  rectHeight: z.number().min(30).max(80),
  wallHeight: z.number().min(15).max(40),
  wallThickness: z.number().min(0.8).max(2),
  stampHeight: z.number().min(15).max(25),
  contentType: z.enum(['text', 'svg']),
  text: z.string().max(30),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(5).max(15),
  svgIcon: z.string().nullable(),
  iconScale: z.number().min(0.5).max(1.0),
  iconLineWidth: z.number().min(0.1).max(1.5),
  cutterColor: z.enum(PLA_COLORS),
  stampColor: z.enum(PLA_COLORS),
})
```

**Constantes fixas:** `CLEARANCE_MM = 0.4`, `RELIEF_DEPTH = 1`, `HANDLE_HEIGHT_RATIO = 0.6`, `CONTENT_MARGIN_MM = 1.5`, `PIECE_GAP_MM = 10`, `EMBED_MM = 0.2`.

## 5. Geometria

Retorno: `{ cutter, stampBase, stampHandle, relief }`, todas posicionadas lado a lado (z ≥ 0).

- **Cortador:** `ExtrudeGeometry` do formato externo (`abertura + 2×espessura`) com furo = abertura; `depth = wallHeight`; sem bevel; sólido fechado.
- **Base do carimbo:** `ExtrudeGeometry` do formato com `abertura − 2×folga`; `depth = stampHeight × (1 − 0.6)`; sem bevel (face de contato plana); `z` a partir de `RELIEF_DEPTH`.
- **Cabo:** círculo de raio `min(base) × 0.3`; `depth = stampHeight × 0.6`; no topo da base.
- **Relevo positivo:** texto (`TextGeometry`) ou ícone SVG (`shared/svgToIconShape.ts`); auto-ajustado em X/Y ao raio útil da base; `depth = RELIEF_DEPTH + EMBED_MM` partindo de `z = 0`, ancorando 0.2mm na base.
- **Layout:** cada peça centralizada na origem e deslocada em X com `PIECE_GAP_MM` entre elas; centradas em Y.

## 6. Estrutura de arquivos

```
confeitaria/
├── shared/svgToIconShape.ts        # SVG → geometria de relevo (compartilhado)
└── cortador-carimbo/
    ├── schema.ts
    ├── buildCutterStamp.ts
    ├── useCutterStamp.ts
    ├── StudioPanel.tsx
    ├── CutterStampPreview.tsx
    └── exportStl.ts
```

## 7. Integração

`StudioPage` passa `params`, `onUpdateParam`, `onSetSvgIcon`, `onReset` ao painel e `geometry`, `cutterColor`, `stampColor` ao preview. `ToolSelector` descreve "Cortador e carimbo em duas peças, num único STL".

## 8. Fora de escopo

- Relevo negativo / booleano CSG (relevo é positivo por sobreposição).
- Chaveiros, letreiros, backend.
