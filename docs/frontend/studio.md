# Studio 3D

## Visão geral

O Studio (`/studio`) é o ambiente de modelagem do 3DFormio. Ferramentas disponíveis:

- **Gerador de Chaveiros** — Chaveiros 3D personalizados com textos e ícones SVG sempre elevados em 1mm, com auto-fit por formato
- **Cartão de Visita** — Cartões de visita 3D com texto em relevo e layout personalizado
- **Suporte de Bolo** — Suportes para exibir bolo com decoração personalizada
- **Suporte para Foto** — Suportes personalizados com texto 3D e slot para fotos
- **Topo de Bolo** — Toppers com texto em relevo ou vazado, ícone SVG e fixação por haste ou base
- **Cortador + Carimbo** — Cortador e carimbo no formato do texto, em duas peças
- **Rolo de Textura** — Rolos cilíndricos fechados (sem cabos) com padrão em relevo (geométrico, ondulado, floral ou SVG)
- **Marcador de Página** — Marcadores 3D em duas peças (base + texto com encaixe em U)

### Componentes Genéricos

- **Topbar** — nome do projeto, Exportar STL, Salvar (disabled)
- **Viewport** — Canvas R3F + OrbitControls + Grid + Environment
- **Status bar** — dimensões em mm + dicas
- **Tool Selector** — Seleção de ferramenta agrupada em duas faixas horizontais: Confeitaria e Letreiros (Chaveiro classificado como Letreiros)

## Como editar

| O que | Onde |
|---|---|
| **Chaveiros** | |
| 14 parâmetros e defaults (conteúdo texto/ícone discriminado) | `src/features/studio/tools/chaveiros/chaveiro/schema.ts` |
| Fontes typeface.json | `src/assets/fonts/` |
| Mapa estilo→fonte | `src/features/studio/tools/chaveiros/chaveiro/fonts.ts` |
| Formas + furo parametrizável | `src/features/studio/tools/chaveiros/chaveiro/shapes.ts` |
| Região útil + auto-fit por formato | `src/features/studio/tools/chaveiros/chaveiro/autoFit.ts` |
| Texto 3D (TextGeometry) | `src/features/studio/tools/chaveiros/chaveiro/textToGeometry.ts` |
| União/expansão de contorno do nome | `src/features/studio/tools/chaveiros/chaveiro/nameOutline.ts` |
| Composição {base, content, contentItems} | `src/features/studio/tools/chaveiros/chaveiro/buildKeychain.ts` |
| Worker + serialização | `src/features/studio/tools/chaveiros/chaveiro/buildKeychain.worker.ts` |
| Interface do worker | `src/features/studio/tools/chaveiros/chaveiro/workerClient.ts` |
| Serialização da geometria | `src/features/studio/tools/chaveiros/chaveiro/workerGeometry.ts` |
| Export STL (merge) | `src/features/studio/tools/chaveiros/chaveiro/exportStl.ts` |
| Estado + parse SVG + worker + debounce | `src/features/studio/tools/chaveiros/chaveiro/useKeychain.ts` |
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
| Base retangular | `src/features/studio/tools/letreiros/marcador-pagina/shapes.ts` |
| Textura da base (motivos e SVG) | `src/features/studio/tools/letreiros/marcador-pagina/patterns.ts` |
| Helper SVG → motivo (compartilhado) | `src/features/studio/tools/confeitaria/shared/svgPattern.ts` |
| Auto-fit de largura | `src/features/studio/tools/letreiros/marcador-pagina/autoFit.ts` |
| Rotação do texto e margem | `src/features/studio/tools/letreiros/marcador-pagina/positioning.ts` |
| Encaixe em U | `src/features/studio/tools/letreiros/marcador-pagina/joint.ts` |
| Composição base + texto com barras | `src/features/studio/tools/letreiros/marcador-pagina/buildBookmark.ts` |
| Worker + serialização | `src/features/studio/tools/letreiros/marcador-pagina/buildBookmark.worker.ts` |
| Interface do worker | `src/features/studio/tools/letreiros/marcador-pagina/workerClient.ts` |
| Serialização da geometria | `src/features/studio/tools/letreiros/marcador-pagina/workerGeometry.ts` |
| Hook de estado | `src/features/studio/tools/letreiros/marcador-pagina/useBookmark.ts` |
| Painel de parâmetros | `src/features/studio/tools/letreiros/marcador-pagina/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/letreiros/marcador-pagina/BookmarkPreview.tsx` |
| Exportar dois STLs | `src/features/studio/tools/letreiros/marcador-pagina/exportStl.ts` |

## Gerador de chaveiros

Pipeline completo de geração do chaveiro 3D:

**useKeychain.ts** → **buildKeychain.worker.ts** → **buildKeychain.ts** → **exportStl.ts**, com **svgToIconShape.ts** compartilhado para ícones SVG.

1. **schema.ts** — Valida e normaliza parâmetros (conteúdo 1–3 itens discriminados em texto/ícone, forma, dimensões)
2. **useKeychain.ts** — Parseia cada SVG na main thread (`ParsedSvg`), aplica debounce e envia `{ params, parsedSvgs, styles }` ao Worker; `isBuilding` alimenta o aviso “Gerando…” e `error` aparece no overlay
3. **autoFit.ts** — Define a região útil por formato (retângulo interno, círculo inscrito, círculo inscrito no coração; `name` sem região), reduz o conteúdo para caber sem ampliar e aplica clamp de borda (4mm) e folga do furo (1mm)
4. **shapes.ts** — Gera a forma base (retângulo, círculo ou coração) com furo nativo para o aro; no formato `name`, a base é a união dos contornos de textos e ícones dilatada por `borderWidth`
5. **textToGeometry.ts** — Cria a geometria 3D do texto com TextGeometry, normalizando o nome
6. **svgToIconShape.ts** (compartilhado) — Converte o SVG em shapes/geometria, com escala e engrossamento de traço (`iconLineWidth`)
7. **buildKeychain.worker.ts** — Carrega as fontes necessárias (typeface.json) e chama `buildKeychain` fora da main thread; o resultado é serializado por `workerGeometry.ts` e devolvido à main thread
8. **buildKeychain.ts** — Compõe os conteúdos sempre elevados em 1mm (`CONTENT_DEPTH`) e mescla as geometrias de conteúdo
9. **exportStl.ts** — Exporta geometria final como STL binário e dispara download

## Marcador de Página

Pipeline completo de geração do marcador:

**useBookmark.ts** → **buildBookmark.worker.ts** → **buildBookmark.ts** → **exportStl.ts**

1. **schema.ts** — Valida parâmetros (dimensões, cores PLA, um único `text` sem limite de caracteres e `pattern` com tipo/densidade/profundidade/SVG)
2. **useBookmark.ts** — Calcula o estilo de fonte do texto, parseia o SVG da textura (com cache), aplica debounce de 200ms e envia `{ params, styles, parsedSvg }` ao Worker; `isBuilding` alimenta “Gerando…” e `error` aparece no overlay. A peça anterior permanece visível durante o rebuild; respostas de worker obsoleto são ignoradas
3. **shapes.ts** — Cria o contorno retangular em pé (largura no X, comprimento no Y) e o extruda em `thickness`; a borda direita da base fica em `x = -0,2mm`
4. **patterns.ts** — Gera os motivos (triângulos, quadrados, círculos, losangos ou SVG) repetidos em grade, recorta na base e extruda o relevo; a faixa de 2,5mm do encaixe fica lisa
5. **autoFit.ts** — Reduz apenas a largura do texto para caber no alvo (preserva a altura), sem ampliar
6. **positioning.ts** — Define a rotação do texto em pé (`TEXT_ROTATION`) e a margem (`TEXT_MARGIN`)
7. **joint.ts** — Define as duas barras do U (1,5 × 0,8mm), centradas na altura do texto, com vão igual à espessura da base + 0,2mm e as posições da base/texto
8. **textToGeometry.ts** — Gera a geometria 3D do texto
9. **buildBookmark.worker.ts** — Carrega as fontes necessárias e chama `buildBookmark` fora da main thread; `workerGeometry.ts` serializa o resultado com `shared/workerGeometry.ts`
10. **buildBookmark.ts** — Gera a textura, aplica auto-fit, coloca o texto em pé com a traseira em `x = 0`, centrado na borda da base (`z = thickness/2`) e mescla as duas barras do U; devolve `{ base, text }` (peças separadas)
11. **exportStl.ts** — Baixa `-base.stl` e `-texto.stl`; o texto é rotacionado para imprimir deitado

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
- **Grid distante (y=-25):** piso de fundo com cores claras que nunca intersecta a figura; câmera frontal `[40, 30, 80]` para melhor leitura do texto.
- **Botões de ferramenta (selecionar/mover/rotacionar/zoom) removidos** — sem funcionalidade, substituídos pelo seletor de formas.
- **Regras de segurança:** conteúdo sempre com borda ≥ 4mm (`TEXT_BORDER_MIN`); furo da argola sempre a ≥ 2mm da borda (`RING_EDGE_MARGIN`). Clamp automático.
- **3 fontes carregadas sob demanda:** helvetiker_regular (normal), helvetiker_bold (bold), optimer_regular (serif). O Worker carrega apenas os estilos usados no build; troca rebuilda geometria.
- **Build em Web Worker + Gerando…:** `useKeychain` parseia o SVG na main thread e envia `{ params, parsedSvgs, styles }` ao `buildKeychain.worker.ts`, que carrega as fontes e roda `buildKeychain` sem bloquear a UI. O resultado é serializado de volta por `workerGeometry.ts`; a peça anterior permanece visível durante o rebuild e erros aparecem no overlay.
- **2 cores no preview:** `buildKeychain` retorna `{base, content, contentItems}`; material base = `baseColor`, material conteúdo = `letterColor`. Troca de cor NÃO rebuilda geometria (só material).
- **Anel de reforço:** anel extrudado ao redor do furo, mergeado na base.
- **Swatches PLA:** 10 cores fixas no schema; STL exportado não carrega cor.
- **Painel Antigo removido:** `StudioToolbar` e `StudioParameters` mortos.
- **Estilo em SelectField:** dropdown nativo no painel — elimina overflow do ButtonGroup anterior.
- **Argola com SelectField:** posição da argola usa dropdown nativo (Cima/Baixo/Esquerda/Direita); embutimento e diâmetro interno mantidos como sliders.
- **Conteúdo discriminado:** `contents[]` (1–3) é uma união discriminada `TextContent | IconContent`; `kind` (`text` | `icon`) define os campos válidos. Texto tem `content`, `fontStyle` e `fontSize`; ícone tem `svgIcon`, `iconScale` e `iconLineWidth`. Ambos compartilham `offsetX/Y`.
- **Auto-fit por formato:** `autoFit.ts` calcula a região útil (retângulo interno, círculo inscrito ou círculo inscrito no coração; `name` sem região) e reduz o conteúdo para caber, sem nunca ampliar. `clampTextPosition` mantém 4mm da borda e 1mm de folga do furo.
- **Conteúdo elevado fixo em 1mm (`CONTENT_DEPTH`):** todos os conteúdos usam a mesma profundidade; não há modo gravado nem relevo configurável.
- **Contorno do nome:** a base é a união dos contornos de textos e ícones; `borderWidth` dilata essa união. A argola fica fora da bounding box de todos os conteúdos, posicionada por `ringPosition` e recuada por margem + raio + `ringRadialOffset`; `ringEmbedding` move a argola para dentro (`- embedding`) e `ringLateralOffset` desloca ao longo da borda. O furo é subtraído da base e do conteúdo.
- **Reuso de ícone SVG:** o helper `shared/svgToIconShape.ts` é compartilhado com a confeitaria para parse, bounds, escala, engrossamento de traço e geometria; o mesmo caminho vale no formato `name`.
- **Posicionamento por editor 2D:** offsets X/Y no schema, arrastar no editor e clamp no build; sliders de posição e drag 3D removidos.
- **Suporte de Bolo:** Base circular com decoração geométrica (hexágonos, linhas, ondas) via ExtrudeGeometry; coluna cônica via CylinderGeometry; prato com borda opcional. 3 alturas predefinidas (40/60/80mm). Schema sem fontes (não precisa de TextGeometry).
- **Suporte para Foto:** Texto 3D dividido em duas partes com slot centralizado para encaixar fotos. Divisão inteligente respeita espaços entre palavras. Slot inclinado a 75° para fotos em tamanhos padrão (10×15, 13×18, 15×20cm). Base de apoio conecta as partes.
- **Topo de Bolo:** Toppers decorativos para bolo com 1–3 textos independentes (modo relevo `raised` ou vazado `cut` via CSG, com fallback para relevo) e ícone SVG opcional (acima ou centro). Placa em `circle`, `rounded-rect`, `oval` ou contorno `custom` por SVG, via ExtrudeGeometry. Textos posicionados pelo editor 2D. Fixação por `haste` (cilindro integrado) ou `base` separada com canaleta de encaixe. Exportação STL binário.
- **Marcador de Página:** Marcadores retangulares, com padrão de 50mm de largura × 100mm de comprimento × 1mm de espessura, ajustáveis (comprimento 50–150mm, largura 30–50mm, espessura 1–2mm). **Duas peças**: base plana e texto em pé com encaixe em U na traseira. A base termina a 0,2mm da traseira do texto e desliza entre **duas barras** (1,5 × 0,8mm) que começam na metade da espessura do texto, com vão igual à espessura da base + 0,2mm. O par de barras é centrado na altura do texto (que coincide com o meio da base); o texto fica centrado na borda da base, metade acima e metade abaixo. A textura da base é recuada 2,5mm da borda direita para não colidir com as barras. O texto é centralizado no comprimento e usa `relief` (3–5mm, default 3mm) como espessura da parede. Não há adicionar/remover textos nem editor de posicionamento. Exportação em **dois STLs**: a base plana e o texto deitado para impressão. Apenas parede em relevo; o modo gravado foi removido. O build roda em Web Worker (`buildBookmark.worker.ts`): `useBookmark` envia `{ params, styles, parsedSvg }` após debounce, o Worker carrega as fontes e devolve a geometria serializada por `workerGeometry.ts` (reutilizando `shared/workerGeometry.ts`). `isBuilding` alimenta “Gerando…”, `error` aparece no overlay e a peça anterior permanece visível durante o rebuild; respostas de worker obsoleto são ignoradas.
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