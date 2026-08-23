# Design — Reformulação Visual do Studio 3D

Data: 2026-08-23
Status: Aprovado
Escopo: Frontend — tema claro, layout com formas na esquerda, parâmetros condensados, fixes de grid e texto gravado

## Contexto

O Studio funciona (gerador de chaveiros com exportação STL), mas com problemas de UX
reportados: cores escuras inconsistentes com a landing, grid 3D cruzando a figura,
texto gravado aparecendo espelhado, painel de parâmetros espaçoso demais e botões
decorativos (selecionar/mover/rotacionar/zoom) sem função.

## Problemas e correções

| Problema | Causa | Correção |
|---|---|---|
| Cores escuras | Painéis com classes Tailwind dark (neutral-900/950) | Tema claro: bg-white, border-neutral-200, teal-600 |
| Grid cruza a figura | Chaveiro no plano XY (vertical), grid no XZ (piso) — se intersectam | Grid desce para y=-25 com fade — piso distante tipo horizonte |
| Texto gravado espelhado | Gravação corta a base de lado a lado (textDepth = thickness+1); visto por trás, o furo aparece espelhado | Gravar só textDepth de profundidade na face frontal; verso fica sólido |
| Parâmetros espaçosos | SliderField com margens internas + blocos de forma/modo no painel | Formas/modo movem para a esquerda; painel w-64, p-3, gap-2, margem do SliderField zerada via CSS |
| Botões decorativos | Selecionar/mover/rotacionar/zoom não fazem nada | Removidos; toolbar vira seletor de formas + modo do texto |

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Componentes UI | Manter Amplify UI (SliderField, TextField, Button) | Decisão do usuário; consistência com AGENTS.md |
| Condensação | Layout (gaps, largura) + override CSS mínimo da margem do SliderField | Sem trocar a lib; densidade real |
| Toolbar esquerda | Formas (▭ ◯ ♥) + modo do texto (A▲/A▼) + reset câmera | "Ferramenta" = forma; estado vem do useKeychain (sem duplicação) |
| Grid | Distante (y=-25), cores claras, fadeDistance 150 | Piso de fundo que nunca cruza a figura |
| Câmera | [40, 30, 80] — mais frontal | Chaveiro vertical: leitura do texto melhora de frente |
| Sombras | ContactShadows removido | Objeto flutua sobre grid distante (product viewer); luzes mantêm volume |
| Gravação | Rasa (textDepth a partir da face frontal, epsilon 0.2 anti-coplanar) | Sem espelhamento por trás; verso sólido |

## Layout

```
┌──────────────────────────────────────────────┐
│ Topbar (branco): logo | nome | Exportar/Salvar│
├────┬────────────────────────────┬────────────┤
│ ▭  │                            │ Parâmetros │
│ ◯  │     Viewport (claro)       │ Nome       │
│ ♥  │  chaveiro vertical         │ 6 sliders  │
│ ── │  grid distante (y=-25)     │ compactos  │
│ A▲ │                            │ Restaurar  │
│ A▼ │                            │            │
│ ── │                            │            │
│ ⌂  │                            │            │
├────┴────────────────────────────┴────────────┤
│ Status bar (branco): dimensões | dicas       │
└──────────────────────────────────────────────┘
```

## Mudanças por arquivo

- `StudioToolbar.tsx` — reescrito: props `{activeShape, onSelectShape, textMode,
  onSelectTextMode, onResetCamera}`; remove `StudioTool`
- `StudioParameters.tsx` — remove formas/RadioGroupField; nome + 6 sliders
  condensados (label row text-xs própria + SliderField label="")
- `StudioPage.tsx` — remove estado activeTool; forma/modo via useKeychain
- `StudioTopbar.tsx`, `StudioStatusBar.tsx` — classes claras
- `StudioViewport.tsx` — bg-neutral-100, câmera [40,30,80], grid y=-25 claro
- `KeychainPreview.tsx` — remove ContactShadows
- `buildKeychain.ts` — gravação rasa: texto em z ∈ [thickness−textDepth−0.1,
  thickness+0.1], CSG subtrai; remove CSG_TEXT_OVERFLOW (vira ENGRAVE_EPSILON)
- `src/index.css` — regra mínima zerando margem do SliderField

## Testes

- Toolbar: formas/modos com aria-pressed, reset câmera; sem botões antigos
- Parameters: sem forma/modo; nome + 6 sliders; updates; restaurar
- StudioPage: mocks atualizados (formas no painel esquerdo)
- Viewport: atuais mantidos; sem ContactShadows no mock
- buildKeychain: gravado → bounding box min.z > -0.3 (verso intacto) e max.z ≈
  thickness + bevel (recesso frontal)
- Topbar/StatusBar: inalterados (só classes)

## Verificação manual

- Girar o modelo: texto gravado nunca aparece espelhado por trás
- Grid sempre atrás/abaixo, nunca cruza a figura
- Painel de parâmetros sem scroll em 1080p

## Fora de escopo

Dark mode toggle, novas formas, mobile drawer, persistência, sombras no grid.

## Definition of Done

- lint/typecheck/test/build verdes
- Tema claro consistente com a landing
- Painel sem scroll em 1080p (nome + 6 sliders)
- Fix do texto gravado coberto por teste
- docs/frontend/studio.md atualizado
- Código morto removido (StudioTool, ícones antigos, CSG_TEXT_OVERFLOW)
