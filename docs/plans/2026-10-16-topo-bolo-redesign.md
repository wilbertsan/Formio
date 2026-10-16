# Topo de Bolo — Reformulação: Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` para implementar task a task.

**Goal:** Reescrever a ferramenta topo-bolo com fixação haste/base, multi-texto (relevo ou corte vazado), contorno por SVG, export STL, testes e docs.

**Architecture:** Padrão das ferramentas maduras `marcador-pagina`/`placa-loja`: schema Zod + `buildCakeTopper` (CSG via `three-bvh-csg` para corte) + hook `useCakeTopper` (reducer multi-texto, fontes em cache, debounce) + painel Amplify + preview R3F + `TextPositionEditor`. Reuso dos helpers `shared/textOutline.ts` e `shared/svgToIconShape.ts`.

**Tech Stack:** React 19, TypeScript strict, Three.js, three-bvh-csg, Zod, Amplify UI, Vitest.

**Status:** Implementado (branch `feat/topo-bolo-redesign`, mesclado em `main`).

## Tarefas

1. **Schema** — multi-texto (1–3), formas `circle`/`rounded-rect`/`oval`/`custom`, `textMode` `raised`/`cut`, `supportType` `haste`/`base`, dims de haste/slot/base, cores PLA, `sanitizeFilename`.
2. **buildCakeTopper** — placa (+ contorno SVG), multi-texto em relevo, ícone SVG, modo vazado (CSG) com fallback, fixação haste/base, contenção shape-aware.
3. **exportStl** — merge placa+relevo+suporte normalizando geometria indexada/não-indexada; STL binário + download.
4. **useCakeTopper** — reducer, cache de fontes por estilo, debounce, descarte correto de geometria.
5. **UI** — `StudioPanel` (5 abas), `TextPositionEditor` (novo), `CakeTopperPreview`.
6. **Integração** — `StudioPage` (export + props), correção dos testes estale do `StudioPage`.
7. **Docs** — `topo-bolo/AGENTS.md`, `confeitaria/AGENTS.md`, `docs/frontend/studio.md`, `ToolSelector`.

## Pontos de atenção conhecidos

- Editor 2D (`TextPositionEditor`) faz clamp por eixo; o builder acopla os eixos em círculo/oval — em arrasto diagonal o editor pode aceitar posição que o 3D re-clampa (apenas UX; geometria permanece válida).
- Campo `proportional` existe no schema mas não é usado pela ferramenta (herança do padrão).
