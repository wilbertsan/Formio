# Studio 3D

## Visão geral

O Studio (`/studio`) é o ambiente de modelagem do 3DFormio. Ferramentas disponíveis:

- **Gerador de Chaveiros** — Chaveiros 3D personalizados com texto em relevo
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
| 17 parâmetros e defaults | `src/features/studio/tools/chaveiros/chaveiro/schema.ts` |
| Fontes typeface.json | `src/assets/fonts/` |
| Mapa estilo→fonte | `src/features/studio/tools/chaveiros/chaveiro/fonts.ts` |
| Formas + furo parametrizável | `src/features/studio/tools/chaveiros/chaveiro/shapes.ts` |
| Texto 3D + fit-to-width | `src/features/studio/tools/chaveiros/chaveiro/textToGeometry.ts` |
| Composição {base, text} | `src/features/studio/tools/chaveiros/chaveiro/buildKeychain.ts` |
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
- **Seletor por categoria:** ferramentas agrupadas em duas faixas horizontais empilhadas (Confeitaria e Letreiros) derivadas do array `TOOLS`; cards com `flex-wrap` e largura responsiva (`w-full sm:w-56`), título da categoria na seção (não mais no card). Chaveiro pertence a Letreiros.
- **Tema claro consistente com a landing** (painéis brancos, bordas neutral-200, ativos brand-600); componentes Amplify UI mantidos (SliderField, TextField).
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