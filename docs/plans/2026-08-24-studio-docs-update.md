# Studio Docs Update Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update `docs/frontend/studio.md` with new sections about multiple texts, drag 3D, stacking, and proportional toggle, then verify and commit.

**Architecture:** Simple documentation update — edit the existing studio.md file with new bullets and table rows, then run verification commands and commit.

**Tech Stack:** Markdown documentation, npm scripts (lint, typecheck, test, build), git

---

### Task 1: Update Visão geral — Bloco Texto

**Files:**
- Modify: `docs/frontend/studio.md:10`

**Step 1: Edit the Texto bullet in Visão geral**

Replace line 10:
```
  - **Texto** — Chips de seleção por texto (+ adicionar até 3, lixeira); controles do selecionado: conteúdo, estilo da letra (dropdown), toggle proporcional à peça, largura/altura do texto (quando proporcional desligado), altura do relevo, posição X/Y (−20–20mm); modo Relevo/Gravado
```

With:
```
  - **Texto** — chips de seleção (até 3 textos), adicionar/remover, conteúdo, estilo da letra (dropdown), toggle proporcional, largura/altura do texto (quando proporcional off), altura do relevo, posição X/Y
  - **Drag 3D** — clicar num texto no viewport seleciona; arrastar move (clamping de borda 4mm e furo 2mm); orbit controls pausados durante o drag
```

---

### Task 2: Update Como editar — add positioning row

**Files:**
- Modify: `docs/frontend/studio.md:32`

**Step 1: Add new row to the table**

The positioning.ts row already exists at line 32. Verify it's correct. If the user wants an additional row about clamping specifically, add it. Based on current content, the row is:
```
| Posicionamento/empilhamento | `src/features/studio/keychain/positioning.ts` |
```

This should be sufficient as-is since positioning.ts handles both stacking and clamping. No change needed here unless the user specifically wants a duplicate row.

---

### Task 3: Update Decisões — add new decisions

**Files:**
- Modify: `docs/frontend/studio.md:74` (after existing decisions)

**Step 1: Add new decision bullets after line 74**

Add these after the existing "Toggle proporcional por texto" decision:

```markdown
- **Textos múltiplos:** `texts: TextItem[]` (1–3) substituiu os campos globais de texto. Cada item tem conteúdo, fonte, dimensões, relevo, proporcional e posição.
- **Empilhamento:** textos empilhados verticalmente centrados, com espaço fixo (altura + 2mm). Offsets do usuário são relativos à posição base.
- **Toggle proporcional por texto:** ligado ignora largura/altura e escala para a área útil × 0.9; desligado usa os sliders manuais.
- **Drag 3D:** raycaster R3F no plano da peça; clamp: AABB para borda (4mm) + distância centro-a-centro para furo (2mm). Commite no pointerup; durante drag só move o mesh (60fps).
- **Cor das letras é global** (não por texto); merge de todas as geometrias de texto num único mesh para export e preview.
```

---

### Task 4: Final verification

**Step 1: Run lint, typecheck, test, build**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Expected: All pass with no errors.

**Step 2: Check for stale references**

```bash
grep -rn "name\|fontStyle\|letterHeight\|textWidth\|textSize\|updateName" src/ tests/ --include="*.ts" --include="*.tsx" | grep -v "node_modules\|tests/app\|normalizeName\|textStyle\|fontStyle.*TextItem\|content\|proportional\|\.name.*projeto\|label.*Estilo" | head -10
```

Expected: No stale references to old field names.

**Step 3: Check recent commits**

```bash
git log --oneline -10
```

---

### Task 5: Commit

**Step 1: Stage and commit**

```bash
git add docs/frontend/studio.md
git commit -m "docs: documenta textos múltiplos com drag"
```

Expected: Commit succeeds with the documentation changes.
