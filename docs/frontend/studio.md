# Studio 3D

## Visão geral

O Studio (`/studio`) é o ambiente de modelagem do 3DFormio. Ferramentas disponíveis:

- **Gerador de Chaveiros** — Chaveiros 3D personalizados com textos e ícones SVG em relevo ou gravados, com auto-fit por formato
- **Cartão de Visita** — Cartões de visita 3D com texto em relevo e layout personalizado
- **Suporte de Bolo** — Suportes para exibir bolo com decoração personalizada
- **Suporte para Foto** — Suportes personalizados com texto 3D e slot para fotos
- **Topo de Bolo** — Toppers com texto em relevo ou vazado, ícone SVG e fixação por haste ou base
- **Cortador + Carimbo** — Cortador e carimbo no formato do texto, em duas peças
- **Rolo de Textura** — Rolos cilíndricos fechados (sem cabos) com padrão em relevo (geométrico, ondulado, floral ou SVG)
- **Marcador de Página** — Marcadores 3D personalizados com texto em relevo e furo para fita

### Componentes Genéricos

- **Topbar** — nome do projeto, Exportar STL, Salvar (disabled)
- **Viewport** — Canvas R3F + OrbitControls + Grid + Environment
- **Status bar** — dimensões em mm + dicas
- **Tool Selector** — Seleção de ferramenta agrupada em duas faixas horizontais: Confeitaria e Letreiros (Chaveiro classificado como Letreiros)

## Como editar

| O que | Onde |
|---|---|
| **Chaveiros** | |
| 16 parâmetros e defaults (conteúdo texto/ícone discriminado) | `src/features/studio/tools/chaveiros/chaveiro/schema.ts` |
| Fontes typeface.json | `src/assets/fonts/` |
| Mapa estilo→fonte | `src/features/studio/tools/chaveiros/chaveiro/fonts.ts` |
| Formas + furo parametrizável | `src/features/studio/tools/chaveiros/chaveiro/shapes.ts` |
| Região útil + auto-fit por formato | `src/features/studio/tools/chaveiros/chaveiro/autoFit.ts` |
| Texto 3D (TextGeometry) | `src/features/studio/tools/chaveiros/chaveiro/textToGeometry.ts` |
| União/expansão de contorno do nome | `src/features/studio/tools/chaveiros/chaveiro/nameOutline.ts` |
| Composição {base, content, contentItems} | `src/features/studio/tools/chaveiros/chaveiro/buildKeychain.ts` |
| Export STL (merge) | `src/features/studio/tools/chaveiros/chaveiro/exportStl.ts` |
| Estado + fontes lazy | `src/features/studio/tools/chaveiros/chaveiro/useKeychain.ts` |
| Painel de blocos | `src/features/studio/tools/chaveiros/chaveiro/StudioPanel.tsx` |
| **Cartão de Visita** | |
| Schema + tipos | `src/features/studio/tools/letreiros/cartao-visita/schema.ts` |
| Geometria base + texto | `src/features/studio/tools/letreiros/cartao-visita/buildCard.ts` |
| Hook de estado | `src/features/studio/tools/letreiros/cartao-visita/useCard.ts` |
| Painel de parâmetros | `src/features/studio/tools/letreiros/cartao-visita/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/letreiros/cartao-visita/CardPreview.tsx` |
| **Suporte de Bolo** | |
| Schema + tipos | `src/features/studio/tools/confeitaria/suporte-bolo/schema.ts` |
| Geometria (base, coluna, prato) | `src/features/studio/tools/confeitaria/suporte-bolo/buildCakeStand.ts` |
| Hook de estado | `src/features/studio/tools/confeitaria/suporte-bolo/useCakeStand.ts` |
| Painel de parâmetros | `src/features/studio/tools/confeitaria/suporte-bolo/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/confeitaria/suporte-bolo/CakeStandPreview.tsx` |
| **Suporte para Foto** | |
| Schema + tipos | `src/features/studio/tools/letreiros/suporte-foto/schema.ts` |
| Geometria com divisão de texto | `src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.ts` |
| Hook de estado | `src/features/studio/tools/letreiros/suporte-foto/usePhotoStand.ts` |
| Painel de parâmetros | `src/features/studio/tools/letreiros/suporte-foto/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/letreiros/suporte-foto/PhotoStandPreview.tsx` |
| **Topo de Bolo** | |
| Schema + tipos | `src/features/studio/tools/confeitaria/topo-bolo/schema.ts` |
| Geometria multi-texto (placa, relevo/CSG, ícone, fixação) | `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts` |
| Hook de estado | `src/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.ts` |
| Painel de parâmetros | `src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/confeitaria/topo-bolo/CakeTopperPreview.tsx` |
| Editor de posição | `src/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.tsx` |
| Export STL | `src/features/studio/tools/confeitaria/topo-bolo/exportStl.ts` |
| **Cortador + Carimbo** | |
| Schema + tipos | `src/features/studio/tools/confeitaria/cortador-carimbo/schema.ts` |
| Geometria (cortador stroke, base única, relevo) | `src/features/studio/tools/confeitaria/cortador-carimbo/buildCutterStamp.ts` |
| Hook de estado | `src/features/studio/tools/confeitaria/cortador-carimbo/useCutterStamp.ts` |
| Painel de parâmetros | `src/features/studio/tools/confeitaria/cortador-carimbo/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/confeitaria/cortador-carimbo/CutterStampPreview.tsx` |
| Export STL | `src/features/studio/tools/confeitaria/cortador-carimbo/exportStl.ts` |
| **Rolo de Textura** | |
| Schema + tipos | `src/features/studio/tools/confeitaria/rolo-textura/schema.ts` |
| Motivos das famílias | `src/features/studio/tools/confeitaria/rolo-textura/patterns.ts` |
| Campo de altura + malha | `src/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller.ts` |
| Worker + serialização | `src/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller.worker.ts` |
| Interface do worker | `src/features/studio/tools/confeitaria/rolo-textura/workerClient.ts` |
| Serialização da geometria | `src/features/studio/tools/confeitaria/rolo-textura/workerGeometry.ts` |
| Hook de estado | `src/features/studio/tools/confeitaria/rolo-textura/useTextureRoller.ts` |
| Painel de parâmetros | `src/features/studio/tools/confeitaria/rolo-textura/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/confeitaria/rolo-textura/TextureRollerPreview.tsx` |
| Export STL | `src/features/studio/tools/confeitaria/rolo-textura/exportStl.ts` |
| Helper SVG compartilhado (SVG → relevo) | `src/features/studio/tools/confeitaria/shared/svgToIconShape.ts` |
| Helper de contorno de texto (texto → geometria) | `src/features/studio/tools/confeitaria/shared/textOutline.ts` |
| **Marcador de Página** | |
| Schema + tipos | `src/features/studio/tools/letreiros/marcador-pagina/schema.ts` |
| Geometria (base retangular + furo) | `src/features/studio/tools/letreiros/marcador-pagina/buildBookmark.ts` |
| Hook de estado | `src/features/studio/tools/letreiros/marcador-pagina/useBookmark.ts` |
| Painel de parâmetros | `src/features/studio/tools/letreiros/marcador-pagina/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/letreiros/marcador-pagina/BookmarkPreview.tsx` |
| Editor de posição | `src/features/studio/tools/letreiros/marcador-pagina/TextPositionEditor.tsx` |
| Export STL | `src/features/studio/tools/letreiros/marcador-pagina/exportStl.ts` |

## Gerador de chaveiros

Pipeline completo de geração do chaveiro 3D:

**schema.ts (Zod)** → **autoFit.ts / shapes.ts (região útil + THREE.Shape + furo nativo)** → **textToGeometry.ts (TextGeometry)** → **buildKeychain.ts (raised = merge, engraved = CSG)** → **exportStl.ts (STL binário + download)**, com **svgToIconShape.ts** compartilhado para ícones SVG.

1. **schema.ts** — Valida e normaliza parâmetros (conteúdo 1–3 itens discriminados em texto/ícone, forma, modo, relevo global, dimensões)
2. **autoFit.ts** — Define a região útil por formato (retângulo interno, círculo inscrito, círculo inscrito no coração; `name` sem região), reduz o conteúdo para caber sem ampliar e aplica clamp de borda (4mm) e folga do furo (1mm)
3. **shapes.ts** — Gera a forma base (retângulo, círculo ou coração) com furo nativo para o aro; no formato `name`, a base é a união dos contornos de textos e ícones dilatada por `borderWidth`
4. **textToGeometry.ts** — Cria a geometria 3D do texto com TextGeometry, normalizando o nome
5. **svgToIconShape.ts** (compartilhado) — Converte o SVG em shapes/geometria, com escala e engrossamento de traço (`iconLineWidth`)
6. **buildKeychain.ts** — Compõe os conteúdos com relevo global (`reliefDepth`): raised usa merge, engraved usa CSG subtração
7. **exportStl.ts** — Exporta geometria final como STL binário e dispara download

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
- **Seletor por categoria:** ferramentas agrupadas em duas faixas horizontais empilhadas (Confeitaria e Letreiros) derivadas do array `TOOLS`; cards com `flex-wrap` e largura responsiva (`w-full sm:w-56`), título da categoria na seção (não mais no card). Chaveiro pertence a Letreiros.
- **Tema claro consistente com a landing** (painéis brancos, bordas neutral-200, ativos brand-600); componentes Amplify UI mantidos (SliderField, TextField).
- **Gravação rasa:** o conteúdo gravado corta apenas `reliefDepth` a partir da face frontal (epsilon 0.2 anti-coplanar) — o verso fica sólido e o conteúdo nunca aparece espelhado por trás.
- **Grid distante (y=-25):** piso de fundo com cores claras que nunca intersecta a figura; câmera frontal `[40, 30, 80]` para melhor leitura do texto.
- **Botões de ferramenta (selecionar/mover/rotacionar/zoom) removidos** — sem funcionalidade, substituídos pelo seletor de formas.
- **Regras de segurança:** conteúdo sempre com borda ≥ 4mm (`TEXT_BORDER_MIN`); furo da argola sempre a ≥ 2mm da borda (`RING_EDGE_MARGIN`). Clamp automático.
- **3 fontes carregadas sob demanda:** helvetiker_regular (normal), helvetiker_bold (bold), optimer_regular (serif). Cache no hook; troca rebuilda geometria.
- **2 cores no preview:** `buildKeychain` retorna `{base, content, contentItems}`; material base = `baseColor`, material conteúdo = `letterColor`. Troca de cor NÃO rebuilda geometria (só material).
- **Anel de reforço:** anel extrudado ao redor do furo, mergeado na base.
- **Swatches PLA:** 10 cores fixas no schema; STL exportado não carrega cor.
- **Painel Antigo removido:** `StudioToolbar` e `StudioParameters` mortos.
- **Estilo em SelectField:** dropdown nativo no painel — elimina overflow do ButtonGroup anterior.
- **Argola com SelectField:** posição da argola usa dropdown nativo (Cima/Baixo/Esquerda/Direita); embutimento e diâmetro interno mantidos como sliders.
- **Conteúdo discriminado:** `contents[]` (1–3) é uma união discriminada `TextContent | IconContent`; `kind` (`text` | `icon`) define os campos válidos. Texto tem `content`, `fontStyle` e `fontSize`; ícone tem `svgIcon`, `iconScale` e `iconLineWidth`. Ambos compartilham `offsetX/Y`.
- **Auto-fit por formato:** `autoFit.ts` calcula a região útil (retângulo interno, círculo inscrito ou círculo inscrito no coração; `name` sem região) e reduz o conteúdo para caber, sem nunca ampliar. `clampTextPosition` mantém 4mm da borda e 1mm de folga do furo.
- **Relevo global:** `reliefDepth` (0.4–2mm, default 1) vale para todos os conteúdos; o relevo por item foi removido.
- **Contorno do nome:** a base é a união dos contornos de textos e ícones; `borderWidth` dilata essa união. A argola fica fora da bounding box de todos os conteúdos, posicionada por `ringPosition` e recuada por margem + raio + `ringRadialOffset`; `ringEmbedding` move a argola para dentro (`- embedding`) e `ringLateralOffset` desloca ao longo da borda. O furo é subtraído da base e do conteúdo.
- **Reuso de ícone SVG:** o helper `shared/svgToIconShape.ts` é compartilhado com a confeitaria para parse, bounds, escala, engrossamento de traço e geometria; o mesmo caminho vale no formato `name`.
- **Posicionamento por editor 2D:** offsets X/Y no schema, arrastar no editor e clamp no build; sliders de posição e drag 3D removidos.
- **Suporte de Bolo:** Base circular com decoração geométrica (hexágonos, linhas, ondas) via ExtrudeGeometry; coluna cônica via CylinderGeometry; prato com borda opcional. 3 alturas predefinidas (40/60/80mm). Schema sem fontes (não precisa de TextGeometry).
- **Suporte para Foto:** Texto 3D dividido em duas partes com slot centralizado para encaixar fotos. Divisão inteligente respeita espaços entre palavras. Slot inclinado a 75° para fotos em tamanhos padrão (10×15, 13×18, 15×20cm). Base de apoio conecta as partes.
- **Topo de Bolo:** Toppers decorativos para bolo com 1–3 textos independentes (modo relevo `raised` ou vazado `cut` via CSG, com fallback para relevo) e ícone SVG opcional (acima ou centro). Placa em `circle`, `rounded-rect`, `oval` ou contorno `custom` por SVG, via ExtrudeGeometry. Textos posicionados pelo editor 2D. Fixação por `haste` (cilindro integrado) ou `base` separada com canaleta de encaixe. Exportação STL binário.
- **Marcador de Página:** Marcadores retangulares finos (2mm) para livros com furo circular para fita/laço. 1-3 textos independentes com posicionamento livre via editor visual. Modos relevo (texto saliente) e gravado (texto afundado via CSG). Dimensões ajustáveis (50-150mm x 30-50mm). Exportação STL binário.
- **Cortador + Carimbo:** Gera duas peças separadas num único STL, a partir de **texto ou ícone SVG** (mutuamente exclusivos), lado a lado. Os contornos vêm de `font.generateShapes` (texto) ou `SVGLoader`+Clipper (SVG, via `shared/svgToIconShape.ts`, com engrossamento de traços finos até `iconLineWidth`). O **cortador** recorta o contorno com margem (`baseMargin`), unindo os elementos — parede de espessura `wallThickness` em volta de `expand(forma, +margem)`, em peça única (sem paredes internas). O **carimbo** (sem cabo) tem **base única** `expand(forma, +margem − folga)` (0.4mm/lado) e a **forma em alto relevo** (`reliefHeight`, 1–3mm) na face de contato. Forma reduzida se exceder `MAX_SHAPE_WIDTH_MM` (150mm). Exportação STL binário das peças mescladas.
- **Rolo de Textura:** Rolo cilíndrico fechado, com tampas planas e filetes de 1mm (sem cabos laterais), e relevo saliente contínuo. O padrão vem de três famílias (geométrico: losangos/bolinhas/grade; ondulado: ondas/chevrons/escamas; floral: flor/folha/roseta) ou de um SVG personalizado repetido como motivo, sem alterações nas formas ou no traço. A densidade define células de 12/8/5mm; a profundidade do relevo é 0.5–2mm. O corpo forma uma única malha fechada por revolução, com tampas planas e filetes de 1mm; o relevo é um campo de altura com resolução de 0.3mm e chanfro de 0.2mm, exibido com `flatShading` para preservar a definição. A repetição fecha exatamente em 360° e no comprimento (sem costura). Build em Web Worker. Exportação STL binário.
- **Carimbo Brigadeiro:** Conteúdo mutuamente exclusivo (`contentType`: texto ou ícone SVG) escolhido por RadioGroupField. Texto e ícone são auto-ajustados (X/Y) para caber no círculo do carimbo respeitando `CONTENT_MARGIN_MM`; relevo fixo de 1mm. O ícone encaixa pelo vértice mais distante do centro (aproveita melhor a área em ícones redondos/irregulares). Traços finos são engrossados até a `iconLineWidth` selecionável (0.1–1.5mm) para impressão; como o SVGLoader não extrusa `stroke`, paths de linha são convertidos em contorno sólido via Clipper (mesma largura aplica-se a fills dilatados). Escala do ícone relativa ao encaixe (0.5–1.0). O ícone SVG é girado 180° no eixo Z para corrigir o Y para baixo do SVGLoader.

## Próximos passos (fora de escopo desta fase)

- Autenticação (Authenticator + rota protegida)
- Geração real via CadQuery (Sprint 2)
- Exportar STL e salvar projeto
- Drawer de parâmetros no mobile

## Testes

`tests/features/studio/` cobre config, hook, componentes e composição da página.
Rodar: `npm run test`.