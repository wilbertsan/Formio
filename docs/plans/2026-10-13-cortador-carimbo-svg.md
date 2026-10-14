# Cortador + Carimbo a partir de SVG — Plano de Execução

**Goal:** Permitir gerar cortador e carimbo a partir de **texto OU ícone SVG**,
reusando o pipeline de SVG do carimbo-brigadeiro.

**Architecture:** extrai `svgToShapes`/`svgBounds` de `shared/svgToIconShape.ts`;
`buildCutterStamp` monta a forma `T` de texto ou SVG; resto unchanged.

---

## Tasks (TDD)

1. **`shared/svgToIconShape.ts`** — `svgBounds`, `svgToShapes`; `buildSvgIconGeometry`
   refatorado para usá-las. Teste novo (`svgToIconShape.test.ts`, 7 casos);
   paridade protegida pelos testes do carimbo-brigadeiro.
2. **Schema** — `contentType`, `svgIcon`, `iconScale`, `iconLineWidth` + refines;
   `MAX_TEXT_WIDTH_MM` → `MAX_SHAPE_WIDTH_MM`.
3. **Build** — `buildShapePaths` trata texto/svg (escala por altura, giro 180°,
   clamp de largura); 4 peças seguem iguais.
4. **Hook** — ação `setSvg`, `setSvgIcon` exposto, ranges de ícone; `contentType`
   trocável antes do upload.
5. **Painel** — seção **Forma** (radio Texto/Ícone SVG + upload + Escala + Espessura).
6. **Integração** — `StudioPage` passa `onSetSvgIcon`; `ToolSelector` atualizado.
7. **Docs** — `AGENTS.md`, `docs/frontend/studio.md`.
8. **Validação** — testes, typecheck, lint, build.

## Validação executada
- `npx vitest run tests/features/studio/tools/confeitaria` → **183 testes** (serializado; a
  execução paralela apresenta timeouts intermitentes de ambiente, pré-existentes).
- `npm run typecheck` limpo · `npx eslint` limpo · `npm run build` OK.

## Notas
- `svgBounds`/`svgToShapes` parseiam o SVG; o debounce de 200ms absorve.
- `RadioGroupField` do Amplify torna o render inicial pesado no jsdom →
  `vi.setConfig({ testTimeout: 15000 })` no teste do painel.
