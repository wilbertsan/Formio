# Design: Cortador + Carimbo a partir de SVG

**Data:** 2026-10-13
**Status:** Aprovado e implementado
**Ferramenta:** Studio 3D > Confeitaria > Cortador + Carimbo

---

## 1. Visão geral

A ferramenta passa a aceitar **texto OU ícone SVG** (mutuamente exclusivos, como
no carimbo-brigadeiro). A forma escolhida (`T`) alimenta o pipeline existente:

- **Cortador**: parede em volta de `expand(T, +margem)` (peça única, sem paredes internas).
- **Base do carimbo**: `expand(T, +margem − folga)`.
- **Relevo**: `T` preenchido em alto relevo.
- **Cabo**: cilíndrico central.

## 2. Pipeline SVG (mesmas ideias do carimbo)

Extraído de `shared/svgToIconShape.ts`:
- `svgBounds(svg)` → dimensões/centro/raio do SVG (unidades do arquivo).
- `svgToShapes(svg, minFeatureSvg)` → shapes com fills dilatados e traços finos
  engrossados até a espessura mínima (mesma unidade).
- `buildSvgIconGeometry` passa a usar as duas (comportamento preservado).

No `buildCutterStamp` (SVG): `svgToShapes` → `toClipperPaths` → `unionPaths` →
escala para `textHeight × iconScale` → giro 180° em Z (correção Y-down) → clamp
`MAX_SHAPE_WIDTH_MM` → centraliza.

## 3. Schema

```
contentType: 'text' | 'svg'   (padrão 'text')
svgIcon: string | null        (padrão null)
iconScale: 0.5–1.0            (padrão 1.0)
iconLineWidth: 0.1–1.5mm      (padrão 0.3)
```
`text` exige texto quando `contentType:'text'`; `svgIcon` obrigatório quando `'svg'`.
`MAX_TEXT_WIDTH_MM` renomeado para `MAX_SHAPE_WIDTH_MM`.

## 4. Painel

Seção **Forma**: radio Texto / Ícone SVG; campos de texto ou upload SVG +
Escala + Espessura da linha. O `contentType` pode ser trocado antes do upload
(reducer tolera estado transitório; o build trata ícone ausente).

## 5. Riscos
- Orientação do SVG: giro 180° em Z (validar visualmente).
- Cortador usa `outerPaths` → corte sólido; base/relevo mantêm furos.
- Traços finos menores que a parede: `iconLineWidth` mitiga.
