# Cortador + Carimbo no formato do texto — Plano de Implementação

**Goal:** Fazer as duas peças terem a forma da palavra (cortador = stroke em volta
da silhueta; carimbo = silhueta preenchida + cabo).

**Architecture:** `textToShapes` → Clipper → `pathsToShapes` (multi-componente) →
`ExtrudeGeometry` + merge. Helper novo em `confeitaria/shared/textOutline.ts`.

**Tech Stack:** React 19, Three.js, `js-clipper`, Zod, Vitest, Amplify UI.

---

## Tasks executadas (TDD)

1. **Helper `shared/textOutline.ts`** — 12 testes (multi-componente: externos, furos,
   desconexos; offset/subtract/escala/translate; textToShapes com fallback de acentos).
2. **Schema** — 12 testes (text, fontStyle, textHeight/wallHeight/wallThickness/stampHeight, cores).
3. **Build** — 7 testes (anel em volta do texto, encolhimento por folga, cabo acima da base,
   layout lado a lado, clamp de largura, texto vazio).
4. **Hook** — 9 testes (default, clamp, fonte, debounce, dimensões, câmera).
5. **Preview** — 1 teste (guard clause).
6. **Painel** — 6 testes (seções Texto/Cortador/Carimbo/Aparência, campos, reset).
7. **Export** — 2 testes (download + merge de 3 peças).
8. **Integração** — `StudioPage` (remove `setSvgIcon`), `ToolSelector`.
9. **Docs** — `AGENTS.md`, `docs/frontend/studio.md`, design/plano.
10. **Verificação** — testes, typecheck, lint, build.

## Decisões
- `js-clipper.d.ts` ganhou os estáticos `PointInPolygon`/`Area` (aditivo).
- `pathsToShapes` classifica por profundidade de containment.
- Export não mudou de comportamento (3 peças), só removeu a referência a `relief`.

## Riscos
- `nameOutline.expandShape` não escala o offset; o helper novo escala (`×1000`) corretamente.
- Traços finos de letras geram paredes finas; cabo central pode ter overhang em palavras longas.
- `tests/features/studio/StudioPage.test.tsx` e `.worktrees/` já falhavam no HEAD.
