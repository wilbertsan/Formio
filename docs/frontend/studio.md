# Studio 3D

## Visão geral

O Studio (`/studio`) é o ambiente de modelagem do 3DFormio. Ferramentas disponíveis:

- **Gerador de Chaveiros** — Chaveiros 3D personalizados com textos e ícones SVG sempre elevados em 1mm, com auto-fit por formato
- **Cartão de Visita** — Cartões de visita 3D com conteúdo livre (texto/ícone), relevo fixo e posicionamento no editor 2D
- **Suporte de Bolo** — Suportes para exibir bolo com decoração personalizada
- **Suporte para Foto** — Suportes de mesa para fotos 10×15, 13×18 e 15×20 cm, com faixa frontal em relevo e fenda de 2 mm
- **Topo de Bolo** — Toppers com texto em relevo alto, ícone SVG e fixação por haste ou haste dupla, com conteúdo unificado no painel
- **Cortador + Carimbo** — Cortador e carimbo no formato do texto, em duas peças
- **Rolo de Textura** — Rolos cilíndricos fechados (sem cabos) com padrão em relevo (geométrico, ondulado, floral ou SVG)
- **Marcador de Página** — Marcadores 3D em duas peças (base + texto com encaixe em U)
- **Caixa Personalizada** — Caixa 3D personalizável com tampa, painel decorativo, puxador lateral e base, em STLs separados
- **Termoformador** — Tela perfurada com malha hexagonal em círculo, quadrado, retângulo, pirâmide truncada ou silhueta SVG; suporte com bacia esférica (círculo) ou bandeja inclinada (demais formas) e macho correspondente, em três STLs separados
- **Porta-lata** — Porta-lata 350 ml com cavidade para lata de 66,2 × 122,2 mm, anéis decorativos na base e no topo, furo de ventilação, nome em relevo de 1 mm e alça removível de abraçadeira, em dois STLs

### Componentes Genéricos

- **Topbar** — nome do projeto, Exportar STL, Salvar (disabled)
- **Viewport** — Canvas R3F + OrbitControls + Grid + Environment
- **Status bar** — dimensões em mm + dicas
- **Tool Selector** — Seleção de ferramenta agrupada em três faixas horizontais: Confeitaria, Letreiros e Lembrancinhas (Chaveiro classificado como Letreiros)

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
| Forma com cantos arredondados | `src/features/studio/tools/letreiros/cartao-visita/shapes.ts` |
| Área útil + auto-fit | `src/features/studio/tools/letreiros/cartao-visita/autoFit.ts` |
| Texto 3D | `src/features/studio/tools/letreiros/cartao-visita/textToGeometry.ts` |
| Composição base + conteúdo | `src/features/studio/tools/letreiros/cartao-visita/buildCard.ts` |
| Worker + serialização | `src/features/studio/tools/letreiros/cartao-visita/buildCard.worker.ts` |
| Interface do worker | `src/features/studio/tools/letreiros/cartao-visita/workerClient.ts` |
| Serialização da geometria | `src/features/studio/tools/letreiros/cartao-visita/workerGeometry.ts` |
| Hook de estado | `src/features/studio/tools/letreiros/cartao-visita/useCard.ts` |
| Painel de parâmetros | `src/features/studio/tools/letreiros/cartao-visita/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/letreiros/cartao-visita/CardPreview.tsx` |
| Editor de posição | `src/features/studio/tools/letreiros/cartao-visita/TextPositionEditor.tsx` |
| Export STL | `src/features/studio/tools/letreiros/cartao-visita/exportStl.ts` |
| **Suporte de Bolo** | |
| Schema + tipos | `src/features/studio/tools/confeitaria/suporte-bolo/schema.ts` |
| Geometria (base, coluna, prato) | `src/features/studio/tools/confeitaria/suporte-bolo/buildCakeStand.ts` |
| Hook de estado | `src/features/studio/tools/confeitaria/suporte-bolo/useCakeStand.ts` |
| Painel de parâmetros | `src/features/studio/tools/confeitaria/suporte-bolo/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/confeitaria/suporte-bolo/CakeStandPreview.tsx` |
| **Suporte para Foto** | |
| Schema + tipos | `src/features/studio/tools/letreiros/suporte-foto/schema.ts` |
| Perfil lateral + extrusão | `src/features/studio/tools/letreiros/suporte-foto/shapes.ts` |
| Área útil da faixa + auto-fit | `src/features/studio/tools/letreiros/suporte-foto/autoFit.ts` |
| Texto 3D | `src/features/studio/tools/letreiros/suporte-foto/textToGeometry.ts` |
| Composição base + conteúdo | `src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.ts` |
| Worker + serialização | `src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.worker.ts` |
| Interface do worker | `src/features/studio/tools/letreiros/suporte-foto/workerClient.ts` |
| Serialização da geometria | `src/features/studio/tools/letreiros/suporte-foto/workerGeometry.ts` |
| Hook de estado | `src/features/studio/tools/letreiros/suporte-foto/usePhotoStand.ts` |
| Painel de parâmetros | `src/features/studio/tools/letreiros/suporte-foto/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/letreiros/suporte-foto/PhotoStandPreview.tsx` |
| Editor de posição | `src/features/studio/tools/letreiros/suporte-foto/PhotoPositionEditor.tsx` |
| Export STL | `src/features/studio/tools/letreiros/suporte-foto/exportStl.ts` |
| **Topo de Bolo** | |
| Schema + tipos | `src/features/studio/tools/confeitaria/topo-bolo/schema.ts` |
| Geometria multi-texto (placa, relevo alto, ícone, hastes de seção quadrada) | `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts` |
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
| Motivos das famílias + espessura mínima | `src/features/studio/tools/confeitaria/rolo-textura/patterns.ts` |
| Layout do relevo (escala, mínimo, emenda) | `src/features/studio/tools/confeitaria/rolo-textura/reliefLayout.ts` |
| Orquestração corpo + relevo | `src/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller.ts` |
| Worker + serialização | `src/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller.worker.ts` |
| Interface do worker | `src/features/studio/tools/confeitaria/rolo-textura/workerClient.ts` |
| Serialização da geometria | `src/features/studio/tools/confeitaria/rolo-textura/workerGeometry.ts` |
| Hook de estado | `src/features/studio/tools/confeitaria/rolo-textura/useTextureRoller.ts` |
| Painel de parâmetros | `src/features/studio/tools/confeitaria/rolo-textura/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/confeitaria/rolo-textura/TextureRollerPreview.tsx` |
| Export STL | `src/features/studio/tools/confeitaria/rolo-textura/exportStl.ts` |
| Helper SVG compartilhado (SVG → relevo) | `src/features/studio/tools/confeitaria/shared/svgToIconShape.ts` |
| Helper SVG → motivo (escala e traço mínimo) | `src/features/studio/tools/confeitaria/shared/svgPattern.ts` |
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
| **Caixa Personalizada** | |
| Schema + tipos (faixas, defaults, cores e constantes) | `src/features/studio/tools/lembrancinhas/caixa-personalizada/schema.ts` |
| Retângulo arredondado (Shape/Path) e amostragem exata | `src/features/studio/tools/lembrancinhas/caixa-personalizada/shapes.ts` |
| Lofts de casca (corpo, tampa e anel) | `src/features/studio/tools/lembrancinhas/caixa-personalizada/shell.ts` |
| Corpo (fundo, cavidade, rim e chanfro) | `src/features/studio/tools/lembrancinhas/caixa-personalizada/buildBody.ts` |
| Tampa (encaixe externo/interno e cap de raio) | `src/features/studio/tools/lembrancinhas/caixa-personalizada/buildLid.ts` |
| Padrão do painel (grade, recorte de cantos e limite de 800) | `src/features/studio/tools/lembrancinhas/caixa-personalizada/panelPattern.ts` |
| Painel decorativo (ExtrudeGeometry, furos e curvatura frontal) | `src/features/studio/tools/lembrancinhas/caixa-personalizada/buildFrontPanel.ts` |
| Puxador (perfil Lathe, posicionamento e limpeza) | `src/features/studio/tools/lembrancinhas/caixa-personalizada/buildHandle.ts` |
| Base (anel com folga de impressão) | `src/features/studio/tools/lembrancinhas/caixa-personalizada/buildBase.ts` |
| Validação (issues e severidade) | `src/features/studio/tools/lembrancinhas/caixa-personalizada/validateBox.ts` |
| Orquestração e montagem das cinco peças | `src/features/studio/tools/lembrancinhas/caixa-personalizada/buildBox.ts` |
| Worker + serialização | `src/features/studio/tools/lembrancinhas/caixa-personalizada/buildBox.worker.ts` |
| Serialização das cinco peças | `src/features/studio/tools/lembrancinhas/caixa-personalizada/workerGeometry.ts` |
| Estado + debounce + worker | `src/features/studio/tools/lembrancinhas/caixa-personalizada/useBox.ts` |
| Painel de parâmetros | `src/features/studio/tools/lembrancinhas/caixa-personalizada/StudioPanel.tsx` |
| Preview R3F (duas cores) | `src/features/studio/tools/lembrancinhas/caixa-personalizada/BoxPreview.tsx` |
| Exportar cinco STLs | `src/features/studio/tools/lembrancinhas/caixa-personalizada/exportStl.ts` |
| **Termoformador** | |
| Schema + tipos (forma, dimensões, SVG, bandeja, macho, cores e constantes) | `src/features/studio/tools/lembrancinhas/termoformador/schema.ts` |
| Contorno, offsets e degrau efetivo | `src/features/studio/tools/lembrancinhas/termoformador/outline.ts` |
| Silhueta SVG (parse, validação, escala e orientação) | `src/features/studio/tools/lembrancinhas/termoformador/svgOutline.ts` |
| Círculo e hexágono (Shape/Path e epsilon angular) | `src/features/studio/tools/lembrancinhas/termoformador/shapes.ts` |
| Layout hexagonal por região (passo, cap de 4.000 e métricas) | `src/features/studio/tools/lembrancinhas/termoformador/screenPattern.ts` |
| Build da tela (ExtrudeGeometry, furos e rotação) | `src/features/studio/tools/lembrancinhas/termoformador/buildScreen.ts` |
| Utilitários de lathe (dedupe e triângulos degenerados) | `src/features/studio/tools/lembrancinhas/termoformador/latheUtils.ts` |
| Dimensões, perfil e LatheGeometry do suporte circular | `src/features/studio/tools/lembrancinhas/termoformador/buildSupport.ts` |
| Dimensões, perfil e LatheGeometry do macho circular | `src/features/studio/tools/lembrancinhas/termoformador/buildPlug.ts` |
| Dimensões da bandeja/pirâmide, degrau e pega | `src/features/studio/tools/lembrancinhas/termoformador/tray.ts` |
| Loft de anéis e prismas | `src/features/studio/tools/lembrancinhas/termoformador/loft.ts` |
| Suporte e macho das novas formas (CSG) | `src/features/studio/tools/lembrancinhas/termoformador/trayParts.ts` |
| CSG com CDT e reparo de T-junctions | `src/features/studio/tools/lembrancinhas/termoformador/csg.ts` |
| Orquestração e despacho por forma | `src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.ts` |
| Validação (issues por forma e SVG) | `src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts` |
| Worker + serialização | `src/features/studio/tools/lembrancinhas/termoformador/buildScreen.worker.ts` |
| Serialização das três peças | `src/features/studio/tools/lembrancinhas/termoformador/workerGeometry.ts` |
| Interface do worker | `src/features/studio/tools/lembrancinhas/termoformador/workerClient.ts` |
| Hook de estado + parse/cache do SVG | `src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts` |
| Painel (Forma, upload e campos condicionais) | `src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx` |
| Preview R3F (três malhas, macho suspenso) | `src/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.tsx` |
| Exportar três STLs (macho girado) | `src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts` |
| **Porta-lata** | |
| Schema + tipos (preset da lata, faixas, defaults, cores e constantes) | `src/features/studio/tools/lembrancinhas/porta-lata/schema.ts` |
| Perfil do corpo com furo e geometria da alça | `src/features/studio/tools/lembrancinhas/porta-lata/shapes.ts` |
| Corpo por revolução com furo de ventilação | `src/features/studio/tools/lembrancinhas/porta-lata/buildBody.ts` |
| Relevo do texto curvado | `src/features/studio/tools/lembrancinhas/porta-lata/buildRelief.ts` |
| Alça de abraçadeira + laço | `src/features/studio/tools/lembrancinhas/porta-lata/buildHandle.ts` |
| Orquestração corpo + relevo (CSG) | `src/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.ts` |
| Validação (issues e severidade) | `src/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.ts` |
| Worker + serialização | `src/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.worker.ts` |
| Serialização das duas peças | `src/features/studio/tools/lembrancinhas/porta-lata/workerGeometry.ts` |
| Interface do worker | `src/features/studio/tools/lembrancinhas/porta-lata/workerClient.ts` |
| Hook de estado | `src/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.ts` |
| Painel de parâmetros | `src/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.tsx` |
| Preview R3F (duas cores) | `src/features/studio/tools/lembrancinhas/porta-lata/CanHolderPreview.tsx` |
| Exportar dois STLs | `src/features/studio/tools/lembrancinhas/porta-lata/exportStl.ts` |

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
4. **patterns.ts** — Gera os motivos (triângulos, quadrados, círculos, losangos ou SVG) repetidos em grade, recorta na base e extruda o relevo; a textura fica 0,2mm antes das barras (faixa lisa de 2,0mm na borda direita)
5. **autoFit.ts** — Reduz apenas a largura do texto para caber no alvo (preserva a altura), sem ampliar
6. **positioning.ts** — Define a rotação do texto em pé (`TEXT_ROTATION`) e a margem (`TEXT_MARGIN`)
7. **joint.ts** — Define as duas barras do U (2,0 × 1,2mm), centradas na altura do texto, com vão igual à espessura da base + 0,2mm e as posições da base/texto
8. **textToGeometry.ts** — Gera a geometria 3D do texto
9. **buildBookmark.worker.ts** — Carrega as fontes necessárias e chama `buildBookmark` fora da main thread; `workerGeometry.ts` serializa o resultado com `shared/workerGeometry.ts`
10. **buildBookmark.ts** — Gera a textura, aplica auto-fit, coloca o texto em pé com a traseira em `x = 0`, centrado na borda da base (`z = thickness/2`) e mescla as duas barras do U; devolve `{ base, text }` (peças separadas)
11. **exportStl.ts** — Baixa `-base.stl` e `-texto.stl`; o texto é rotacionado para imprimir deitado

## Caixa Personalizada

Pipeline completo de geração da Caixa Personalizada:

**useBox.ts** → **buildBox.worker.ts** → **buildBox.ts** → **exportStl.ts**

1. **schema.ts** — Valida parâmetros (dimensões, acabamento, tampa, painel, puxador, base, impressão e duas cores PLA) e concentra `MINIMUM_WALL_MM`, `MINIMUM_FEATURE_MM`, `MAX_PANEL_OPENINGS` e `PANEL_CURVATURE_MM`
2. **shapes.ts** — Traça o retângulo arredondado como `Shape`/`Path` e amostra o contorno com contagem fixa por canto/aresta (`roundedRectExactPoints`) para os lofts
3. **shell.ts** — `buildBodyShell`, `buildLidShell` e `buildRingShell` costuram anéis de retângulo arredondado com o mesmo número de pontos; os triângulos são orientados por normal de referência e finalizados com `computeVertexNormals()`. Anéis coincidentes geram quads de área zero, descartados sem abrir lacunas reais
4. **useBox.ts** — Reducer + Zod com clamp dos sliders (debounce de 250 ms). Um worker é criado a cada build e o anterior é terminado; respostas obsoletas são ignoradas. A peça anterior permanece visível durante o rebuild e é descartada quando a nova geometria chega. `issues` roda na main thread; dimensões vêm da bounding box das peças e `builtParams` guarda o snapshot exato usado no build
5. **buildBox.worker.ts** — Executa `buildBox` fora da main thread; `workerGeometry.ts` serializa as cinco peças (position/normal/index) com transferência de buffers
6. **buildBox.ts** — Monta as peças habilitadas: painel centrado na face frontal em `z = depth/2`, tampa deslocada por `getLidDimensions().bottomY`, corpo na origem, puxador e base já posicionados
7. **exportStl.ts** — Baixa um STL binário por peça habilitada, com clone centralizado na mesa

As cinco peças independentes:

- **Corpo** — Casca fechada loftada de anéis: fundo plano de `bottomThickness`, parede externa, cavidade interna com `wallThickness`, degrau e anel do rim (`rimHeight` e `rimThickness`, nunca menor que a parede) e chanfro `edgeChamfer` nos extremos
- **Tampa** — Placa superior de `lidThickness` e saia de `lidFitDepth`. `external` envolve o corpo com `lidClearance`; `internal` encaixa na abertura do rim. A altura interna `lidHeight` é medida acima da borda do corpo. A tampa externa assenta em `lidHeight = 0`; valores maiores elevam a tampa no preview e exigem junta/suporte. A tampa interna é um plugue dentro da abertura, sem flange de apoio
- **Painel decorativo** — Retângulo arredondado em `ExtrudeGeometry` com furos nativos no `Shape`, montado sobre a face frontal (+Z), com moldura sólida de `borderWidth`
- **Puxador lateral** — `LatheGeometry` de perfil fechado (flange, haste e ponta arredondada), perpendicular à lateral escolhida (`left` ou `right` na v1; `top`/`bottom` ficam reservados e avisam via `handle-side`)
- **Base** — Anel loftado com `buildRingShell` em volta da parte inferior do corpo, face interna com folga `printClearance` e raio interno limitado por `min(cornerRadius, min(width, depth)/2) + printClearance`

Detalhes de implementação:

- Corpo, tampa e base são lofts de anéis de retângulo arredondado, sem CSG. A base não usa ExtrudeGeometry: `buildRingShell` amostra cantos e arestas com contagem exata e garante anel de pelo menos `MINIMUM_FEATURE_MM` (0,8 mm) no topo, limitando o chanfro. O raio interno do furo não é apenas `outerRadius - baseThickness`: ele é limitado ao raio do canto do corpo mais `printClearance` (`min(cornerRadius, min(width, depth)/2) + printClearance`), para que o furo contenha o corpo sem cortar os cantos; `getBaseDimensions` reporta o valor efetivo
- O painel fica montado na frente (+Z) do corpo, sem janela passante. Os furos são recortados contra o retângulo interno arredondado (cantos respeitados), a grade é limitada a 800 aberturas (o espaçamento cresce 15% até caber) e `grid`/`mesh` recebem um epsilon de 0,001 rad somente no builder para o earcut fechar a malha. A curvatura (`slightly_convex`/`slightly_concave`) desloca apenas a face frontal em até `PANEL_CURVATURE_MM`; a traseira permanece plana
- A tampa externa calcula o raio interno como teto (`bodyRadius + lidClearance`) e o externo como `inner + lidThickness`. `lidCornerRadius` é apenas um pedido: o raio efetivo é limitado pelo encaixe do corpo e reportado por `getLidDimensions`. No encaixe interno, `lidFitDepth` é limitado a `bodyTop - bottomThickness` para não atingir o fundo
- O puxador é colado na face por um flange, sem furo passante. O raio da ponta é limitado por `min(handleTipRadius, availableTip, shaftRadius)` e os triângulos degenerados do polo do `LatheGeometry` são removidos. A v1 restringe a lateral a `left`/`right`; `top`/`bottom` ficam reservados e geram o aviso `handle-side`. A montagem também avisa colisões `panel-base`, `panel-lid`, `handle-base-collision` e `handle-lid-collision`
- Duas cores no preview: `bodyColor` no corpo e `accentColor` na tampa, painel, puxador e base. Trocar cor não rebuilda geometria; o STL exportado não carrega cor
- Validação por códigos: `corner-radius`, `wall`, `panel-border`, `panel-empty`, `panel-hole`, `panel-rib`, `panel-density`, `panel-overhang`, `panel-height`, `panel-radius`, `panel-base`, `panel-lid`, `lid-clearance`, `lid-fit-depth`, `lid-internal`, `handle-tip`, `handle-base`, `handle-flange`, `handle-side`, `handle-base-collision`, `handle-lid-collision`, `base-height` e `base-thin`, com severidade `error` ou `warning`. Os problemas aparecem na seção **Validação** do painel e não bloqueiam os sliders
- Exportação: `-corpo`, `-tampa`, `-painel`, `-puxador` e `-base`. O corpo e a base saem como construídos; a tampa é invertida (placa na mesa, saia para cima); o painel é deitado com a face traseira na mesa; o puxador é girado de volta para ficar em pé sobre o flange. O `prepareHandleForPrint` usa o `builtParams` do build para desfazer a matriz de posicionamento e centralizar a peça. Até cinco downloads podem ser disparados e o navegador pode pedir permissão
- `resetAzimuth=30` no `StudioViewport` porque o painel decorativo fica em +Z; a câmera inicial precisa olhar a face frontal

## Termoformador (círculo, quadrado, retângulo, pirâmide e SVG)

Pipeline completo de geração da tela perfurada, do suporte côncavo e do macho
convexo nas cinco formas:

**useThermoformer.ts** → **buildScreen.worker.ts** → **buildThermoformer.ts** →
**buildScreen.ts** + **buildSupport.ts** + **buildPlug.ts** → **exportStl.ts**

1. **schema.ts** — Valida forma (`circle`, `square`, `rectangle`, `pyramid` ou
   `svg`), diâmetro, largura/altura, tamanho do SVG, ângulo de saída, fundo da
   pirâmide, espessura, aro, linha, abertura, parâmetros do suporte, altura do
   corpo do macho (`plugHeight`) e cor PLA; concentra `MINIMUM_LINE_MM`,
   `MINIMUM_SUPPORT_MM`, `MAX_SCREEN_OPENINGS`, `SCREEN_SEGMENTS`,
   `MINIMUM_TRAY_BOTTOM_SCALE`, `MINIMUM_PYRAMID_TIP_MM`,
   `PLUG_GRIP_MIN_MATERIAL_MM`, `PLUG_GRIP_MAX_MM`, `PLUG_GRIP_SEGMENTS`,
   `PLUG_GRIP_OVERLAP_MM`, `PLUG_PROTRUSION_OVERLAP_MM`,
   `PLUG_GRIP_TIP_RADIUS_MM` e `PLUG_PREVIEW_GAP_MM`
2. **outline.ts** — Deriva o contorno da tela: círculo em `diameter/2`; quadrado
   em `width`; retângulo em `width × height`; pirâmide em um quadrado de `width`;
   SVG pela silhueta achatada. Calcula `perforated` (recuo de `frameWidth`),
   `cavityOpening` (recuo de `fitClearance - effectiveStep`), `recess`
   (crescimento de `fitClearance`) e `supportOuter` (recesso + `wallThickness`).
   O degrau efetivo das novas formas é
   `max(stepWidth, frameWidth + fitClearance)`; o círculo mantém `stepWidth`.
   Join `miter` para quadrado/retângulo/pirâmide e `round` para SVG
3. **svgOutline.ts** — Une preenchimentos, converte traços em contorno, exige
   uma silhueta única, fechada, sem furos ou ilhas, escala pela maior dimensão
   (`svgSize`), centraliza na origem e corrige o eixo Y do SVG
4. **screenPattern.ts** — Calcula a treliça hexagonal flat-top
   (`spacing = opening + lineWidth`, circunraio `opening / √3`) por região:
   círculo em `diameter/2 - frameWidth`; polígonos dentro de `perforated` recuado
   pelo circunraio. Favos parciais são descartados, o limite de 4.000 favos
   cresce a abertura 15% por iteração e o padrão reporta `innerBounds`,
   `innerRadius` e a abertura efetiva
5. **useThermoformer.ts** — Reducer + Zod com clamp dos sliders (debounce de
   250 ms), parse do SVG na main thread com cache por conteúdo (`ParsedSvg`), um
   worker por build com descarte de respostas obsoletas, validação na main thread
   e `outline` memoizado. O worker recebe `{ params, parsedSvg }`; o `svg` bruto
   fica fora da mensagem. SVG ausente/ilegível não chama o worker e mostra o erro
   no painel
6. **buildScreen.worker.ts** — Executa `buildThermoformer` fora da main thread;
   `workerGeometry.ts` serializa as três peças (position/normal/index) e o
   `seatY` com transferência de buffers. Contorno inválido devolve
   `{ error: 'invalid-outline' }`
7. **buildThermoformer.ts** — Orquestra `buildScreen`, `buildSupport` e
   `buildPlug` e devolve `{ screen, support, plug, seatY }`; o círculo usa
   `getSupportDimensions().seatY` e as novas formas usam
   `getTrayDimensions().seatY`
8. **buildScreen.ts** — `Shape` do contorno (círculo ou polígono) com furos
   hexagonais nativos em `ExtrudeGeometry`, girado para deitar em XZ com a
   espessura em +Y
9. **buildSupport.ts** — No círculo, perfil 2D fechado no plano `(r, y)` (fundo,
   parede externa, aro, parede do rebaixo, degrau e arco esférico) convertido em
   `LatheGeometry` com `SCREEN_SEGMENTS`; a bacia é limitada à semi-esfera
   (`cavityTopRadius`) para o macho poder ser retirado, e os triângulos
   degenerados do eixo são removidos por `latheUtils.ts`. Nas novas formas,
   `trayParts.ts` monta o suporte por CSG: prisma externo − prisma do rebaixo
   (de `seatY` ao topo) − loft da cavidade (de `bottomThickness` a `seatY`, topo
   em `cavityOpening` e fundo em `cavityOpening × bottomScale`)
10. **buildPlug.ts** — No círculo, deriva o domo da bacia deslocada por
    `thickness`, a coroa plana em `seatY + thickness`, a parede-guia em
    `diameter/2` com `fitClearance` e a pega cônica; perfil 2D fechado em
    `LatheGeometry`. Nas novas formas, `trayParts.ts` une o prisma do corpo
    (`contactY`–`bodyTop`) ao loft da protrusão (`bottomThickness + thickness`–
    `contactY`) e subtrai a pega. O `csg.ts` usa `three-bvh-csg` com CDT
    (`useCDTClipping`), atributos `position`/`normal`,
    `removeDegenerateTriangles` e o reparo de T-junctions `splitTJunctions`
11. **exportStl.ts** — Baixa três STLs binários, `<nome>-tela.stl`,
    `<nome>-suporte.stl` e `<nome>-macho.stl`, cada peça centralizada na mesa; o
    macho é girado 180° com o topo plano na mesa e a peça convexa para cima

Detalhes:

- A forma define o conjunto inteiro: tela, suporte e macho acompanham o mesmo
  contorno. Não há mistura de tela quadrada com suporte circular. As três peças
  continuam independentes e saem em STLs separados.
- **Tela:** plana, espessura constante e aro sólido de `frameWidth`. O círculo
  mantém `innerRadius = diameter/2 - frameWidth`; os polígonos usam o contorno
  recuado. A borda sólida efetiva pode chegar a `frameWidth + circunraio`, porque
  favos parciais são descartados. O `HEXAGON_ANGLE_EPSILON` (0,001 rad) evita
  vértices exatamente colineares que abrem os caps do Earcut.
- **Degrau efetivo:** nas novas formas,
  `effectiveStep = max(stepWidth, frameWidth + fitClearance)` garante que a
  moldura da tela fique sobre o degrau e o macho não colida com ela. Quando o
  degrau é ampliado, `support-step-clamped` avisa; quando o `stepWidth` pedido
  passa da moldura, `support-step-frame` avisa.
- **Bandeja:** `bottomScale =
  1 - 2 × effectiveDepth × tan(draftAngle) / min(cavityOpening)`. Abaixo de 5%,
  a profundidade efetiva é reduzida para manter o fundo mínimo e `support-depth`
  avisa. O fundo é uma cópia reduzida do contorno, com paredes inclinadas para
  desmoldar; `support-draft` avisa abaixo de 2°. A bandeja não usa
  `edgeChamfer`; o chanfro continua só no suporte circular.
- **Pirâmide:** base quadrada e cavidade truncada. `bottomScale = pyramidTip`,
  então o fundo é um quadrado pequeno e plano, não um ponto. `support-tip` avisa
  quando o fundo fica abaixo de 3 mm. O macho tem a mesma pirâmide truncada, com
  ponta plana.
- **SVG:** o `SVGLoader` depende de `DOMParser`, que não existe no worker. O
  parse roda na main thread, é cacheado pelo conteúdo e o `ParsedSvg` vai ao
  worker. O resultado precisa ser **uma silhueta única, fechada, sem furos e sem
  ilhas**: furos, ilhas ou vários contornos externos geram `svg-contour`. A
  escala é uniforme pela maior dimensão (`svgSize`), com centro na origem e Y
  corrigido. SVG ausente gera `svg-missing`; ilegível, `svg-parse`; contorno da
  tela acima de 300 mm (defensivo), `svg-size`; offset que se divide em ilhas ou
  contorno acima de 1.500 pontos, `svg-feature`. O erro de SVG impede o build.
- **CSG do suporte e do macho:** suporte = prisma externo − rebaixo − loft da
  cavidade; macho = corpo ∪ protrusão − pega. O CSG usa o avaliador com CDT do
  Porta-lata, limpa triângulos degenerados e repara T-junctions; os testes exigem
  `isClosed`, volume positivo e nenhum triângulo de área zero em quadrado,
  retângulo, pirâmide, estrela e C. A protrusão sobe 0,1 mm dentro do corpo e o
  corte da pega começa 0,1 mm acima do topo para o CSG não cortar faces
  coplanares. A ponta do cone vira um frustum de 0,01 mm para fechar a malha.
- **Pega segura:** o centro só é aceito se o disco do raio inteiro cabe no
  material. O algoritmo encolhe o contorno pelo raio pedido, escolhe a maior
  ilha, usa o centro do envelope quando ele está dentro e, senão, o baricentro
  do maior triângulo da triangulação. Sem centro interior ou sem material, a pega
  é desabilitada, o topo do macho fica plano e `plug-grip` avisa. A profundidade
  mantém 6 mm de material: sobre a cavidade o piso é
  `bottomThickness + thickness`; fora dela, é a face de contato (`contactY`),
  para a pega não furar a coroa. O raio acompanha a profundidade
  (`depth / 1,2`, parede de 40–45°), com máximo de 30 mm e mínimo de 0,5 mm.
- **Círculo:** mantém o modo da v1. O suporte deriva o diâmetro da tela
  (`recessRadius = diameter/2 + fitClearance`,
  `outerRadius = recessRadius + wallThickness`); o rebaixo tem a espessura da
  tela, então ela apoia no degrau e fica nivelada com o topo. O degrau circular
  começa em `recessRadius - stepWidth`, com sobreposição
  `stepWidth - fitClearance` (mínimo 1,4 mm pelos limites do schema). A
  profundidade efetiva da bacia é limitada para manter 0,8 mm entre a bacia e a
  parede externa e para não passar de `cavityTopRadius` (no máximo uma
  semi-esfera); quando o clamp atua, `support-depth` avisa. O macho é a bacia
  deslocada por `thickness`: domo em `bottomThickness + thickness` no centro,
  coroa em `seatY + thickness` (`contactY`) e parede-guia em
  `diameter/2` com `fitClearance`. O círculo continua em `LatheGeometry`, sem
  CSG.
- **Exportação:** a tela e o suporte saem como construídos e o macho é girado
  180° para apoiar o topo plano na mesa, com a peça convexa para cima; assim
  imprime sem suporte e a face de contato não recebe marcas. Cada peça é clonada
  e centralizada na mesa, com a base em `y = 0`. O STL não carrega cor. Três
  downloads podem acionar a permissão de múltiplos arquivos do navegador.
- **Preview e enquadramento:** o suporte fica na base, a tela plana em `seatY` e
  o macho suspenso em `plugLift = effectiveDepth + 8 mm` (no círculo,
  `effectiveBowlDepth + 8`). `fitRadius` usa a esfera envolvente da união suporte
  + macho suspenso; a status bar continua mostrando o envelope do suporte e o
  painel mostra as medidas da tela, do suporte e do macho.
- **Validação:** `screen-frame`, `screen-empty`, `screen-density`,
  `screen-opening` e `screen-line` cobrem a tela; `support-step`,
  `support-step-clamped`, `support-step-frame`, `support-draft`, `support-depth`,
  `support-tip`, `support-wall`, `support-bottom` e `support-clearance` cobrem o
  suporte; `plug-guide` é defensiva no círculo e `plug-grip` avisa a pega
  desabilitada nas novas formas; `svg-missing`, `svg-parse`, `svg-contour`,
  `svg-feature` e `svg-size` cobrem o SVG. A validação é consultiva e aparece na
  seção **Validação**; os erros de SVG bloqueiam o build antes do worker, e uma
  falha do worker aparece no overlay.
- **Limitações conhecidas:** `svg-feature` é **error** no código, embora o design
  previsse warning; o hook bloqueia o build antes do worker para offsets que não
  formam uma única silhueta. Em um C com a barra logo acima do raio da pega, o suporte pode
  apresentar uma costura capilar e `isClosed` falso; o macho correspondente fecha
  e é o caso coberto por teste. A validação não sinaliza essa costura
  (`svg-feature` só pega ilhas ou contornos acima de 1.500 pontos), então evite
  SVGs nesse limite ou simplifique o contorno.
- **Cores e desempenho:** cor não rebuilda geometria e as três peças usam a mesma
  cor PLA. O pior caso circular (~3.571 favos) levou ~7 s; as novas formas
  acrescentam CSG e também rodam no worker para não travar a UI. A linha padrão é
  0,4 mm, equivalente a uma extrusão de bico 0,4 mm; abaixo disso a malha fica
  frágil e a validação avisa.
- Os testes validam a malha com `isClosed` (cada aresta em dois triângulos e
  winding coerente), volume positivo e contagem de triângulos de área zero. O
  modo circular mantém os testes da v1.

Resumo: o círculo preserva a bacia esférica e o caminho `LatheGeometry`; quadrado,
retângulo, pirâmide e SVG usam contorno próprio, bandeja/pirâmide com paredes
inclinadas e CSG com CDT. A tela é sempre plana, o macho é a ferramenta de
conformação e as três peças saem em STLs separados.

## Porta-lata

Pipeline completo de geração do porta-lata 350 ml:

**useCanHolder.ts** → **buildCanHolder.worker.ts** → **buildCanHolder.ts** →
**buildBody.ts** + **buildRelief.ts** + **buildHandle.ts** → **exportStl.ts**

1. **schema.ts** — Fixa o preset da lata (`CAN_DIAMETER` 66,2 mm,
   `CAN_HEIGHT` 122,2 mm, `CAN_TOP_DIAMETER` 54 mm, `CAN_VOLUME_ML` 350) e
   valida corpo, bordas, alça, personalização e duas cores PLA;
   `canHolderGeometryParamsSchema` exclui as cores para não rebuildar ao trocar
   cor. Também concentra os derivados `getInnerDiameter`, `getOuterRadius`,
   `getOuterDiameter`, `getOuterHeight`, `getExposedHeight`, `getTopLand`,
   `getEffectiveLeadIn`, `getEffectiveRimChamfer`,
   `getEffectiveRingProtrusion`, `getMaxOuterDiameter`, `getRingWallBand`,
   `getTextBand`, `getTextureEnvelope` e `getEffectiveTextureDepth`;
   `MIN_EDGE_RIM_FLAT_MM` (1 mm), `TEXT_BAND_MARGIN_MM` (2 mm) e as constantes
   de textura (`TEXTURE_RADIAL_SEGMENTS` 256, `TEXTURE_STEP_MM` 1,
   `TEXTURE_EDGE_FADE_MM` 2, `TEXTURE_HANDLE_GAP_MM` 1,
   `TEXTURE_HANDLE_FADE_MM` 2) são constantes.
2. **shapes.ts** — Perfil fechado `(r, y)` com furo de ventilação e os dois
   anéis decorativos (face de apoio na mesa, chanfro de base, um flanco de 45°
   por anel, parede entre os anéis e borda com chanfro e lead-in), parede
   interna, fundo interno e parede do furo; também o contorno da abraçadeira de
   200° e o laço em D. Concentra `getBandInnerRadius`, `getLoopLeftX` e
   `getHandleMetrics`.
3. **buildBody.ts** — `LatheGeometry` de 128 segmentos; com textura, a parede
   externa é localizada por `findOuterWall`, subdividida em passos de 1 mm e o
   lathe usa 256 segmentos (512 nos importados, com passo de 0,4 mm); os
   vértices da parede são deslocados radialmente por
   `textureDisplacement` e as normais da emenda θ=0/2π são soldadas (de novo no
   `buildCanHolder`, depois do CSG do texto). O perfil não
   toca o eixo, então não há leques degenerados, mas a limpeza de triângulos
   colapsados roda como defesa e preserva position/normal/uv.
4. **buildRelief.ts** — `textToShapes`/`shapesToGeometry`, subdivisão conforme
   até 2,5 mm, auto-fit para 120°, curvatura no raio constante a 180° da alça e
   1 mm de relevo visível (0,2 mm embutido para a união); o centro do texto é
   clampado entre os anéis por `getTextBand`. Com textura, a extrusão soma o
   envelope efetivo (`CONTENT_DEPTH + RELIEF_EMBED + envelope`) e a curvatura usa
   `outerR + envelope`: a base continua em `outerR − 0,2` e a frente fica 1 mm
   acima do pico.
5. **buildHandle.ts** — Abraçadeira com perfil quadrático: folga nominal no
   meio, interferência absoluta de 0,4 mm no topo e folga +0,4 mm na base; a
   borda esquerda do laço é vertical, a `handleClearance + 2 mm` da parede.
   Abraçadeira + laço são unidos por CSG com `steps: 8` no anel.
6. **buildCanHolder.ts** — Une o relevo ao corpo (`ADDITION`,
   `useCDTClipping`) e devolve `{ body, handle }`; limpa triângulos colapsados.
   Fechamento, casca única e furo passante são verificados nos testes.
7. **useCanHolder.ts** — Reducer + Zod, clamps, debounce de 250 ms, um worker
   por build, descarte de respostas obsoletas, snapshot `builtParams` e descarte
   da geometria anterior. Expõe `outerDiameter` (via `getMaxOuterDiameter`, com
   o maior envelope entre anéis e textura), `outerHeight` e `exposedHeight`; não
   há capacidade em ml.
8. **exportStl.ts** — Dois STLs binários: `<nome>-corpo.stl` e
   `<nome>-alca.stl`; cada peça é clonada e centralizada na mesa com a base em
   `y = 0`.

Parâmetros do corpo: `cavityDepth` 80–116/108, `canClearance` 0,5–1,2/0,8,
`wallThickness` 1,8–4/2,4, `bottomThickness` 2–6/3,2, `ventHoleDiameter` 6–14/10,
`rimLeadIn` 0,5–2/1,0 e `rimChamfer` 0–1,5/0,4 mm. Bordas: `edgeRimEnabled`
(booleano), `edgeRimProtrusion` 0,4–1,5/1,0 e `edgeRimWidth` 4–14/6 mm.
Textura: `textureStyle` com `none`, 6 procedurais (`wood`, `metal`, `scales`,
`waves`, `stone`, `spikes`) e 14 importadas (`azulejos`, `mosaico`,
`tijolos_pequenos`, `reboco_pequeno`, `tijolos_rusticos`, `reboco_quebrado`,
`tijolos_limpos`, `paralelepipedos`, `paralelepipedos_suaves`,
`placa_diamantada`, `pedra_hexagonal`, `asfalto`, `hex_scifi`,
`hex_scifi_pequeno`); default `none`. `textureDepth` 0,4–1,5/0,8 e
`textureScale` 4–16/8 valem só para procedurais. Na alça: `handleHeight` 35–85/60, `handleGap` 24–40/30, `handleReach` 30–50/40,
`handleBand` 5–10/6,5, `handleWidth` 8–16/12 e `handleClearance` 0,2–0,5/0,3 mm.
Personalização: `text` até 20 caracteres, `textSize` 6–18/10, `fontStyle`
normal/bold/serif e `textCenterY` 20–90/60.

Dimensões derivadas no default: interna **67,8 mm**, externa da parede
**72,6 mm**, externa máxima **74,6 mm** (maior envelope: anel 1,0 ou textura
efetiva), altura externa **111,2 mm**, lata
exposta **14,2 mm**, parede do topo **2,0 mm**, furo de ventilação **10 mm**,
anel de apoio no fundo com **28,9 mm** de largura radial e faixa útil do texto
**8,0–103,2 mm** (`getTextBand`; a faixa geométrica entre anéis é
**6,0–105,2 mm**). Com textura de 1,5 mm e escala ≥ 6, o diâmetro externo vai a
**75,6 mm**; com escala 4, a profundidade efetiva cai para 1,0 mm (anel ainda é
o maior envelope) e o diâmetro fica **74,6 mm**. Nos importados, a profundidade
nativa medida é **1,21–4,25 mm**; `pedra_hexagonal` (4,25) leva o diâmetro a
**81,1 mm** e o laço a um offset de 2,65 mm. O painel mostra diâmetro
externo, altura externa, altura exposta, parede do topo, `Texto entre X e Y mm`
e, quando a escala limita a profundidade, `Profundidade efetiva: X mm (limitada
pela escala).`; o status bar mostra **74.6 × 111.2 × 2.4 mm** no default.

Validação por códigos: `can-cavity`, `can-clearance`, `can-vent`, `can-rim`,
`can-wall`, `can-bottom`, `can-edge-rim`, `can-texture`, `can-text-fit`,
`can-text-band`,
`can-handle-gap`, `can-handle-reach`, `can-handle-fit` e `can-handle-band`.
`can-texture` é um aviso **só para procedurais**: a profundidade pedida passa de
`escala / 4` e o build usa a profundidade efetiva. Importados usam a
profundidade nativa e não têm código de inclinação; a nota de suporte fica na
seção Textura (todos medem 67,8–82,7° no mapa de 512×256; é um limite inferior,
pois a inclinação cresce com a resolução). `can-edge-rim` é defensiva (`2 × salto + 1 mm > largura` e
`2 × largura + 4 mm > altura`) e inalcançável pelo schema. `can-text-band` usa
`getTextBand`, que desconta os anéis e aplica 2 mm de margem. `can-handle-band`
valida apenas a banda da abraçadeira (`handleHeight ± handleWidth / 2`) entre os
anéis; o laço em D pode passar da borda superior do corpo. Falhas de runtime do
worker usam `can-invalid`, `can-font`, `can-csg` e `can-build`. A validação é
consultiva: avisos e erros não bloqueiam o build nem o export.

Textura:

- **Estilos** (`texture.ts`): madeira (veios verticais com warp lento), metal
  (knurl diagonal cruzado), escamas (fileiras de 0,6 × escala com calotas de
  0,55 × escala, avaliando três fileiras), ondas (seno horizontal modulado em
  θ), pedra (ruído de valor em duas oitavas) e pontiagudo (cones com meia-base
  `max(profundidade efetiva, 0,3 × escala)`). Tudo determinístico e periódico em
  θ; a contagem de células é inteira (`max(3, round(circunferência / escala))`).
- **Profundidade efetiva**: `min(textureDepth, textureScale / 4)`, limitando os
  flancos a ~45°; nos procedurais as facetas do mesh de 1 mm × 256 segmentos
  medem no máximo ~42,5° (spikes, escala 6, profundidade 1,5). Nos importados a
  parede de 512 segmentos × 0,4 mm expõe facetas de 68–83°, vindas do relevo
  original; a nota de suporte do painel cobre.
- **Máscaras**: fade de `max(2, 3 × profundidade efetiva)` nas bordas da parede
  e na faixa lisa da abraçadeira (`handleHeight ± (handleWidth / 2 + 1)`), com a
  mesma transição. Anéis, base, borda, cavidade e furo ficam intactos.
- **Custo**: parede texturizada ~57k triângulos; build completo texturado
  ~0,8–1,1 s de CPU (gate de 15 s), mantendo 256 segmentos e passo de 1 mm.
- **Texto**: sobe pelo envelope efetivo, ficando 1 mm acima do pico; a base
  permanece 0,2 mm dentro da parede.

Texturas importadas:

- **Geração offline**: `scripts/texture-import.mjs` lê os 14 STLs de `files/`
  (não versionados, ~400 MB), desenrola a superfície externa com
  `unwrapCylinder` (grade 512 × 256, maior raio por célula, filtro de furo
  0,78 × maior raio, corte das pontas/flange pela mediana do raio) e grava
  `importedTextures.ts` (metadados) e `importedTextureData.ts` (base64, 2,4 MB /
  2,33 MiB,
  importado só pelo `texture.ts`/worker). `node scripts/texture-import.mjs
  --check` valida o asset; exige Node 24 e os STLs locais.
- **Mapeamento**: `u = θ/2π` (volta completa, sem emenda) e
  `v = (y − paredeMin) / (paredeMax − paredeMin)`; o padrão preenche a parede
  entre os anéis e é redimensionado (distorção horizontal ~1,4–2,4×, até ~2,6×
  nos vales; vertical 0,93–1,57×). A
  profundidade radial é a nativa do arquivo.
- **Alça**: `getLoopOffset = max(0, envelope − (handleClearance + 2 − 0,7))`;
  `getLoopLeftX` soma o offset e `getBandOuterRadius`/`getHandleMetrics`
  engrossam a abraçadeira para fora. O raio interno/fit não muda; a abertura da
  mão cai (ex.: 22,05 mm em `pedra_hexagonal`). A sobreposição de ~1,5 mm no
  meio e ~0,7 mm no topo vale no plano central; o canto lateral é cosmético e
  não solta a peça.
- **Painel**: select com os grupos Procedurais/Importadas; nos importados,
  profundidade e escala ficam desabilitados e aparece "Textura importada:
  profundidade X mm · flancos ~N°. Pode exigir suporte.".
- **Custo**: 14 mapas normalizados; o asset cresce 2,4 MB / 2,33 MiB e o chunk
  do worker fica em ~2,88 MB raw / ~1,40 MB gzip (carregado no mount); o build
  completo importado mediu **5,6–6,5 s de CPU**
  em máquina ociosa (frio 6,5 s; sob carga pode passar de 10 s) com 512/0,4,
  sem fallback.

Alta definição (importados):

- **Mapa 512 × 256** (u ≈ 0,45 mm, v ≈ 0,39 mm); asset 2,4 MB (2,33 MiB, gzip
  ~1,28 MB); worker chunk ~2,88 MB raw / ~1,40 MB gzip. O data é carregado no
  mount do worker mesmo com `textureStyle: none`; import dinâmico/compressão
  ficam como follow-up.
- **Parede 512 segmentos × 0,4 mm** (266.240 triângulos; ~291,6k com o texto;
  STL do corpo ~14,6 MB). Procedurais seguem 256/1 e `none` 128.
- **Build** `buildBody` importado 0,65–0,85 s (~1 s frio); build completo com
  texto 5,6–6,5 s de CPU em máquina ociosa (paralelepípedos 5,6; pedra 5,8;
  frio 6,5; sob carga pode passar de 10 s); default `none` ~1,3 s.
- **Preview**: flat shading no corpo quando o snapshot (`builtParams`) é
  importado; a alça continua suave. O material do corpo tem
  `key={flatShading ? 'flat' : 'smooth'}` porque o R3F 9.7.0 não marca
  `needsUpdate` ao trocar `flatShading` e o program antigo seria reutilizado.
- **Testes**: 14 corpos importados em 5 arquivos e os builds completos em 6
  (`buildCanHolder`, `...Textures`, `...Extremes`, `...ExtremesTextures`,
  `...Imported`, `...ImportedDeep`), com timeout de 60 s; a suíte completa fica
  em 1622 testes e ~66–72 s.

Detalhes:

- O relevo é unido por `three-bvh-csg` com o splitter CDT; o splitter legado
  deixa T-junctions e arestas abertas. O resultado é fechado e single-shell nos
  extremos de tamanho.
- A alça não usa trilho: a abraçadeira abraça o corpo por pressão, entra por
  baixo e é removível. O corpo é cilíndrico, então o laço tem borda esquerda
  vertical e a abertura da mão não varia com a altura.
- O corpo imprime em pé, sem suporte: o anel inferior é a superfície de apoio
  (face plana em `y = 0`) e o anel superior tem a face inferior a 45°. A alça
  imprime em pé, apoiada na borda inferior do laço, com suporte sob toda a face
  inferior do arco de 200°.
- O texto fica sempre a 180° da alça, na parede entre os anéis; o build clampa o
  centro em `getTextBand` e o auto-fit de 120° mantém a personalização longe da
  abraçadeira.
- Duas cores no preview (`bodyColor`/`accentColor`); trocar cor não rebuilda. O
  STL não carrega cor.
- Build padrão medido em ~0,8 s de CPU no primeiro build e ~0,6 s com JIT
  quente; 20 caracteres em 18 mm levam ~1,1 s. O teste roda no processo do
  Vitest, inclui a fonte e as asserções (~1,0 s no default) e usa gate de 15 s
  com `process.threadCpuUsage` (fallback `process.cpuUsage`), não relógio de
  parede.

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
- **Seletor por categoria:** ferramentas agrupadas em três faixas horizontais empilhadas (Confeitaria, Letreiros e Lembrancinhas) derivadas do array `TOOLS`; cards com `flex-wrap` e largura responsiva (`w-full sm:w-56`), título da categoria na seção (não mais no card). Chaveiro pertence a Letreiros.
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
- **Suporte para Foto:** Peça única de mesa para fotos 10×15, 13×18 e 15×20cm, formada por base horizontal, faixa frontal vertical, fenda de 2mm e painel inclinado atrás. A largura é a da foto + 2× `sideMargin` (3–20mm); a faixa tem `bandHeight` (15–40mm), a espessura fica em 2–4mm e a inclinação em 60–85°. O perfil lateral é extrudado na largura, sem CSG, e a profundidade efetiva é `max(depth, ribBack + 2)`, garantindo fenda e painel válidos em qualquer combinação. Conteúdo de 1–3 itens texto/ícone SVG, com relevo fixo de 1mm, margem de 3mm e auto-fit à área útil da faixa; texto usa `fontSize` 3–15mm e ícone usa `iconScale` 0.5–1.0 e `iconLineWidth` 0.1–1.5mm. Build em Web Worker, preview R3F em 2 materiais (base e conteúdo) e export STL binário. Editor 2D SVG da faixa com arraste pointer/touch, nudge por setas e clamp à área útil.
- **Topo de Bolo:** Toppers decorativos para bolo com 1–3 textos independentes e um ícone SVG opcional, todos dentro de uma única seção **Conteúdo** no painel. O conteúdo é sempre gerado em relevo alto: cada texto usa `relief` (0,4–3mm) e o ícone usa 1mm. A largura do texto é um limite máximo e comprime apenas o eixo X; a altura é o tamanho da fonte e é preservada. Placa em `circle`, `rounded-rect` (padrão), `oval` ou contorno `custom` por SVG, via ExtrudeGeometry. Textos e ícone são posicionados livremente por um editor 2D SVG (contorno real da placa, tamanhos reais dos conteúdos, arraste pointer/touch e nudge por setas): textos usam `offsetX`/`offsetY`; o ícone usa `iconOffsetX`/`iconOffsetY`, ambos limitados ao contorno da placa. Fixação por `haste` (uma haste) ou `haste-dupla` (duas hastes paralelas), com haste de seção quadrada cujo lado é a espessura da placa, ponta chanfrada e espaçamento ajustável na haste dupla; em contornos estreitos, a haste dupla se aproxima e pode cair para haste simples. Exportação STL binário.
- **Marcador de Página:** Marcadores retangulares, com padrão de 50mm de largura × 100mm de comprimento × 1mm de espessura, ajustáveis (comprimento 50–150mm, largura 30–50mm, espessura 1–2mm). **Duas peças**: base plana e texto em pé com encaixe em U na traseira. A base termina a 0,2mm da traseira do texto e desliza entre **duas barras** (2,0 × 1,2mm) que começam na metade da espessura do texto, com vão igual à espessura da base + 0,2mm. O par de barras é centrado na altura do texto (que coincide com o meio da base); o texto fica centrado na borda da base, metade acima e metade abaixo. A textura da base é recuada 2,2mm da traseira do texto, ficando 0,2mm antes das barras. O texto é centralizado no comprimento e usa `relief` (3–5mm, default 3mm) como espessura da parede. Não há adicionar/remover textos nem editor de posicionamento. Exportação em **dois STLs**: a base plana e o texto deitado para impressão. Apenas parede em relevo; o modo gravado foi removido. O build roda em Web Worker (`buildBookmark.worker.ts`): `useBookmark` envia `{ params, styles, parsedSvg }` após debounce, o Worker carrega as fontes e devolve a geometria serializada por `workerGeometry.ts` (reutilizando `shared/workerGeometry.ts`). `isBuilding` alimenta “Gerando…”, `error` aparece no overlay e a peça anterior permanece visível durante o rebuild; respostas de worker obsoleto são ignoradas.
- **Cortador + Carimbo:** Gera duas peças separadas num único STL, a partir de **texto ou ícone SVG** (mutuamente exclusivos), lado a lado. Os contornos vêm de `font.generateShapes` (texto) ou `SVGLoader`+Clipper (SVG, via `shared/svgToIconShape.ts`, com engrossamento de traços finos até `iconLineWidth`). O **cortador** recorta o contorno com margem (`baseMargin`), unindo os elementos — parede de espessura `wallThickness` em volta de `expand(forma, +margem)`, em peça única (sem paredes internas). O **carimbo** (sem cabo) tem **base única** `expand(forma, +margem − folga)` (0.4mm/lado) e a **forma em alto relevo** (`reliefHeight`, 1–3mm) na face de contato. Forma reduzida se exceder `MAX_SHAPE_WIDTH_MM` (150mm). Exportação STL binário das peças mescladas.
- **Rolo de Textura:** Rolo cilíndrico fechado, com tampas planas e filetes de 1mm (sem cabos laterais), e relevo saliente. O padrão vem de três famílias (geométrico: losangos/bolinhas/grade; ondulado: ondas/chevrons/escamas; floral: flor/folha/roseta) ou de um SVG personalizado repetido como motivo. O relevo é vetorial, extrudado e curvado sobre o cilindro, com escala uniforme por `min(cellW, cellH)` e slider de escala (40–100%). Traços finos de motivos e SVG são engrossados até 0,8mm; preenchimentos sólidos do SVG não são alterados e a centerline é preservada. Motivos contínuos ultrapassam a célula em X para emendar sem costura. A densidade define células de 12/8/5mm; a profundidade do relevo é 0.5–2mm. O corpo é uma malha fechada por revolução; o relevo é mesclado ao corpo em grupos de material. A repetição fecha exatamente em 360° e no comprimento. Build em Web Worker. Exportação STL binário.
- **Carimbo Brigadeiro:** Corpo único em hiperboloide com cintura central (LatheGeometry; duas "folhas" visuais) — face de contato plana no diâmetro, cintura no meio e topo menor; imprime com a face para cima (overhang ≲ 45°). Conteúdo mutuamente exclusivo (`contentType`: texto ou ícone SVG) escolhido por RadioGroupField. Texto e ícone são auto-ajustados (X/Y) para caber no círculo do carimbo respeitando `CONTENT_MARGIN_MM`; a elevação do relevo é ajustável (`reliefElevation`, 0.5–3.0mm, padrão 1mm) e o conteúdo sobressai abaixo da face de contato. O ícone encaixa pelo vértice mais distante do centro (aproveita melhor a área em ícones redondos/irregulares). Traços finos são engrossados até a `iconLineWidth` selecionável (0.1–1.5mm) para impressão; como o SVGLoader não extrusa `stroke`, paths de linha são convertidos em contorno sólido via Clipper (mesma largura aplica-se a fills dilatados). Escala do ícone relativa ao encaixe (0.5–1.0). O ícone SVG é girado 180° no eixo Z para corrigir o Y para baixo do SVGLoader.
- **Cartão de Visita:** Peça retangular (50–90 × 30–60mm, 1–3mm de espessura) com cantos arredondados. Conteúdo livre de 1–3 itens texto/ícone SVG, com texto sem limite de caracteres e auto-fit à área útil de 3mm. Relevo fixo de 1mm. Build em Web Worker, editor 2D SVG com medidas reais e export STL binário. Sem argola.
- **Caixa Personalizada:** Caixa 3D personalizável em cinco peças independentes (corpo, tampa, painel decorativo, puxador e base), sem CSG: corpo e tampa são lofts de anéis de retângulo arredondado, a base é um anel loftado e o painel usa `ExtrudeGeometry` com furos. O acabamento da v1 é apenas `edgeChamfer`; fillets 3D reais, janela frontal e furo passante do puxador ficam fora. O painel é montado na frente (+Z) com moldura sólida, furos recortados no retângulo interno e limite de 800 aberturas. A tampa externa tem o raio limitado pelo encaixe do corpo e o encaixe interno não passa do fundo. O puxador usa flange colado (sem furo), ponta limitada ao raio da haste e limpeza de triângulos degenerados. A base tem folga `printClearance`, raio interno derivado do canto do corpo e anel mínimo de 0,8 mm. O puxador fica em `left`/`right` na v1; `top`/`bottom` são reservados. A tampa externa assenta em `lidHeight = 0`; valores maiores exigem junta/suporte, e a tampa interna é um plugue sem flange. A montagem avisa colisões entre painel/base, painel/tampa e flange/base ou flange/tampa. Preview em duas cores (`bodyColor` e `accentColor`), export em cinco STLs separados com orientações de impressão e `builtParams` para o transform do puxador. `nozzleDiameter`, 3MF e STEP ficam fora da v1.
- **Termoformador (círculo, quadrado, retângulo, pirâmide e SVG):** Três peças independentes; a forma define o conjunto inteiro. A tela é plana, com aro sólido e malha hexagonal flat-top em `ExtrudeGeometry` com furos hexagonais; favos limitados a 4.000, abertura crescendo 15% ao exceder e epsilon de 0,001 rad por favo. O círculo mantém o suporte e o macho em `LatheGeometry`, com bacia esférica limitada à semi-esfera e pega cônica; as novas formas usam contorno próprio, bandeja/pirâmide de paredes inclinadas e CSG com CDT, limpeza de triângulos degenerados e reparo de T-junctions. O degrau efetivo é `max(stepWidth, frameWidth + fitClearance)`; o SVG precisa ser uma silhueta única, sem furos/ilhas, escalada pela maior dimensão e parseada na main thread. A pega é segura (maior ilha interior), desabilita com topo plano e limita a profundidade a 6 mm de material. A tela é exportada plana; o macho é girado 180° no export. Preview com tela em `seatY`, macho em `plugLift = profundidade efetiva + 8` e `fitRadius` pela união; status bar com o envelope do suporte. Build em worker; o pior caso circular (~3.571 favos) leva ~7 s.
- **Porta-lata:** Substitui a antiga caneca por um corpo de parede simples em `LatheGeometry` com cavidade reta para a lata de 66,2 × 122,2 mm, borda de entrada e furo central de ventilação de 10 mm; sem trilho. Dois anéis decorativos de 45° compartilham salto (0,4–1,5 mm) e largura (4–14 mm), ficam colados na base e no topo e são pontos do mesmo perfil; o inferior apoia na mesa e o superior imprime sem suporte. O diâmetro nominal (`getMaxOuterDiameter`, 74,6 mm no default) e o status bar incluem os anéis, mas não o relevo. O nome fica em relevo de 1 mm curvado no raio, a 180° da alça e entre os anéis, com faixa única em `getTextBand`; é unido por CSG com o splitter CDT. Alça separada de encaixe por pressão: abraçadeira em C de 200° com folga nominal no meio, interferência absoluta de 0,4 mm no topo e laço em D com borda esquerda vertical; abraçadeira e laço são unidos por CSG dentro da alça. A validação `can-handle-band` cobre só a banda da abraçadeira entre os anéis, então o laço pode passar da borda; `can-edge-rim` é defensiva. Duas cores (`bodyColor`/`accentColor`), dois STLs `-corpo` e `-alca`, build em worker. A alça imprime em pé com suporte sob o arco; o corpo imprime em pé sem suporte. O relevo usa subdivisão conforme de 2,5 mm para manter 1 mm no centro de glifos largos. As texturas são um campo de altura determinístico aplicado à parede (sem CSG): 256 segmentos/passo de 1 mm nos procedurais e 512/0,4 mm nos importados, relevo positivo, faixa lisa na abraçadeira e texto elevado pelo envelope efetivo. Os 14 estilos importados vêm de mapas 512×256 gerados offline a partir dos STLs, preservam a profundidade nativa, usam o mesmo deslocamento, afastam o laço/engrossam a abraçadeira pelo envelope e aparecem com flat shading no preview.

## Próximos passos (fora de escopo desta fase)

- Autenticação (Authenticator + rota protegida)
- Geração real via CadQuery (Sprint 2)
- Exportar STL e salvar projeto
- Drawer de parâmetros no mobile

## Testes

`tests/features/studio/` cobre config, hook, componentes e composição da página.
Rodar: `npm run test`.