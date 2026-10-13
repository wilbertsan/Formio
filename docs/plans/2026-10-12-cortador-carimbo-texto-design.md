# Design: Cortador + Carimbo no formato do texto

**Data:** 2026-10-12
**Status:** Aprovado e implementado
**Ferramenta:** Studio 3D > Confeitaria > Cortador + Carimbo

---

## 1. Visão geral

As duas peças passam a ter a **forma da palavra**, seguindo o contorno das letras:

- **Cortador** — parede (stroke) que contorna a silhueta preenchida do texto: faixa
  de largura `wallThickness` em volta do contorno externo **e** dos furos internos
  (`expand(texto, +t) − texto`). Ao cortar, sai a palavra em massa.
- **Carimbo** — silhueta preenchida do texto, encolhida em `CLEARANCE_MM` para caber
  no corte, extrudada com **cabo cilíndrico central** no topo.

O texto substitui os formatos círculo/retângulo/estrela e o conceito de "conteúdo"
(texto/SVG em relevo). SVG saiu do escopo.

## 2. Pipeline

`font.generateShapes(texto, textHeight)` → `Shape[]` (com furos) → Clipper
(union/offset/subtract) → `pathsToShapes` (multi-componente) → `ExtrudeGeometry`
por Shape + merge.

Novo helper `shared/textOutline.ts`:
- `textToShapes`, `toClipperPaths`, `unionPaths`, `offsetPaths`, `subtractPaths`
- `scalePaths`, `translatePaths`, `pathsBoundingBox`
- `pathsToShapes` (classifica externos/furos por profundidade de containment)
- `shapesToGeometry`

## 3. Parâmetros

```
text: 1–30 caracteres
fontStyle: normal | bold | serif
textHeight: 10–60mm
wallHeight: 15–40mm
wallThickness: 0.8–2mm
stampHeight: 15–25mm
cutterColor, stampColor (10 cores PLA)
```
Fixos: `CLEARANCE_MM=0.4`, `HANDLE_HEIGHT_RATIO=0.6`, `PIECE_GAP_MM=10`,
`MAX_TEXT_WIDTH_MM=150`, `HANDLE_RADIUS_RATIO=0.35`.

Texto reduzido proporcionalmente se exceder 150mm de largura.

## 4. Decisões
- Texto substitui os formatos; sem relevo/SVG.
- Cortador = stroke (parede) em volta da silhueta (externo + counters).
- Carimbo = silhueta preenchida + cabo central.
- Helper dedicado multi-componente (não altera o chaveiro).
- Acentos preservados; fallback sem acentos se faltar glifo.

## 5. Fora de escopo
Relevo negativo/CSG; chaveiros, letreiros, backend.
