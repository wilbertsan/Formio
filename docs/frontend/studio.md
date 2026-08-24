# Studio 3D

## Visão geral

O Studio (`/studio`) é o ambiente de modelagem do 3DFormio. A primeira ferramenta
real é o **gerador de chaveiros** (frontend puro, exportação STL):

- **Topbar** — nome do projeto, Exportar STL (funcional), Salvar (disabled)
- **Painel único** — coluna à esquerda (~300px) com dropdown "Produto" e 3 blocos Accordion (Texto, Base, Argola):
  - **Texto** — chips de seleção (até 3 textos), adicionar/remover, conteúdo, estilo da letra (dropdown), toggle proporcional à peça, largura/altura do texto (quando proporcional off), altura do relevo
  - **Posicionamento 2D** — botão ✥ no bloco Texto abre editor SVG com o desenho da base, furo e textos arrastáveis; snapping de contato garante que todo texto fique conectado (topo, furo ou texto anterior) — nunca flutua
  - **Base** — largura da peça, forma, cores, espessura, borda
  - **Argola** — posição (SelectField com 4 opções), diâmetro interno (3–10mm), embutimento (0–3mm)
- **Viewport** — ocupa todo o espaço restante; tema claro com chaveiro vertical, câmera frontal e grid distante como piso de fundo
- **Status bar** — dimensões em mm + dicas

Acesso: botão "Studio 3D" na navbar e "Abrir o Studio" no hero da landing
(rota pública; autenticação entra em ciclo futuro).

## Como editar

| O que | Onde |
|---|---|
| 17 parâmetros e defaults (`textWidth`, `textSize`, `letterHeight`, etc.) | `src/features/studio/keychain/schema.ts` |
| Fontes typeface.json | `src/assets/fonts/` |
| Mapa estilo→fonte | `src/features/studio/keychain/fonts.ts` |
| Formas + furo parametrizável | `src/features/studio/keychain/shapes.ts` |
| Texto 3D + fit-to-width | `src/features/studio/keychain/textToGeometry.ts` |
| Composição {base, text} | `src/features/studio/keychain/buildKeychain.ts` |
| Export STL (merge) | `src/features/studio/keychain/exportStl.ts` |
| Estado + fontes lazy | `src/features/studio/hooks/useKeychain.ts` |
| Painel de blocos | `src/features/studio/components/StudioPanel.tsx` |
| Posicionamento/empilhamento | `src/features/studio/keychain/positioning.ts` |
| Editor 2D de textos | `src/features/studio/components/TextPositionEditor.tsx` |
| Snapping de contato | `src/features/studio/keychain/positioning.ts` |

## Gerador de chaveiros

Pipeline completo de geração do chaveiro 3D:

**schema.ts (Zod)** → **shapes.ts (THREE.Shape + furo nativo)** → **textToGeometry.ts (TextGeometry + fit-to-width)** → **buildKeychain.ts (raised = merge, engraved = CSG)** → **exportStl.ts (STL binário + download)**

1. **schema.ts** — Valida e normaliza parâmetros (nome 1-12 chars, forma, modo de texto, dimensões)
2. **shapes.ts** — Gera a forma base (retângulo, círculo ou coração) com furo nativo para o aro
3. **textToGeometry.ts** — Cria geometria 3D do texto com TextGeometry, ajusta escura para caber na base
4. **buildKeychain.ts** — Composição: raised (rebaixado) usa merge, engraved (gravado) usa CSG subtração
5. **exportStl.ts** — Exporta geometria final como STL binário e dispara download

## Decisões

- **R3F + drei:** stack oficial do AGENTS.md; OrbitControls/Grid/Environment do
  drei evitam boilerplate.
- **1 unidade three.js = 1 mm:** dimensões da UI mapeiam direto para a cena.
- **React.lazy em /studio:** three.js (~600KB) fica em chunk separado — a
  landing não paga esse custo.
- **Estado local com useReducer + Zod:** sem estado global (YAGNI); o schema
  valida e clampa os valores dos sliders.
- **Mock de fiber/drei nos testes:** jsdom não tem WebGL; Canvas e componentes
  drei são mockados nos testes do viewport/page.
- **Tema claro consistente com a landing** (painéis brancos, bordas neutral-200, ativos teal-600); componentes Amplify UI mantidos (SliderField, TextField).
- **Gravação rasa:** o texto gravado corta apenas `textDepth` a partir da face frontal (epsilon 0.2 anti-coplanar) — o verso fica sólido e o texto nunca aparece espelhado por trás.
- **Grid distante (y=-25):** piso de fundo com cores claras que nunca intersecta a figura; câmera frontal `[40, 30, 80]` para melhor leitura do texto.
- **Botões de ferramenta (selecionar/mover/rotacionar/zoom) removidos** — sem funcionalidade, substituídos pelo seletor de formas.
- **Regras de segurança:** texto sempre com borda ≥ 4mm (`TEXT_BORDER_MIN`); furo da argola sempre a ≥ 2mm da borda (`RING_EDGE_MARGIN`). Clamp automático.
- **3 fontes carregadas sob demanda:** helvetiker_regular (normal), helvetiker_bold (bold), optimer_regular (serif). Cache no hook; troca rebuilda geometria.
- **2 cores no preview:** `buildKeychain` retorna `{base, text}`; material base = `baseColor`, material texto = `letterColor`. Troca de cor NÃO rebuilda geometria (só material).
- **Anel de reforço:** anel extrudado ao redor do furo, mergeado na base.
- **Swatches PLA:** 10 cores fixas no schema; STL exportado não carrega cor.
- **Painel Antigo removido:** `StudioToolbar` e `StudioParameters` mortos.
- **Controle direto do texto:** `textWidth` (8–60mm) e `textSize` (4–20mm) no schema; escala uniforme no build limitada pela área útil (regra de 4mm preservada).
- **Estilo em SelectField:** dropdown nativo no painel — elimina overflow do ButtonGroup anterior.
- **Argola com SelectField:** posição da argola usa dropdown nativo (Cima/Baixo/Esquerda/Direita); embutimento e diâmetro interno mantidos como sliders.
- **Textos múltiplos:** `texts: TextItem[]` (1–3) no schema; cada item com conteúdo, fonte, tamanho, largura, relevo, proporcional e posição X/Y próprios. Campos globais antigos (`name`, `fontStyle`, `letterHeight`, `textWidth`, `textSize`) removidos.
- **Empilhamento automático:** textos empilhados verticalmente centrados; offsets X/Y são relativos à posição base.
- **Toggle proporcional por texto:** ligado = escala automática; desligado = sliders manuais de largura/altura.
- **Snap de contato:** todo texto encosta no topo interno, no furo/anel ou na base do texto anterior (fusão de 0.5mm). Aplicado no editor (pointerUp) e no build — fonte única de verdade.
- **Sliders Posição X/Y removidos** e drag 3D removidos — posicionamento exclusivamente pelo editor 2D.

## Próximos passos (fora de escopo desta fase)

- Autenticação (Authenticator + rota protegida)
- Geração real via CadQuery (Sprint 2)
- Exportar STL e salvar projeto
- Drawer de parâmetros no mobile

## Testes

`tests/features/studio/` cobre config, hook, componentes e composição da página.
Rodar: `npm run test`.