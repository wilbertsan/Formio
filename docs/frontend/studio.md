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
- **Termoformador** — Tela circular perfurada com malha hexagonal, aro sólido e suporte côncavo, em STLs separados
- **Caneca Personalizada** — Caneca de parede simples com nome em relevo de 1 mm e alça removível de abraçadeira, em dois STLs

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
| Schema + tipos (faixas, defaults, cores e constantes) | `src/features/studio/tools/lembrancinhas/termoformador/schema.ts` |
| Círculo e hexágono (Shape/Path e epsilon angular) | `src/features/studio/tools/lembrancinhas/termoformador/shapes.ts` |
| Layout hexagonal (passo, cap de 4.000 e métricas) | `src/features/studio/tools/lembrancinhas/termoformador/screenPattern.ts` |
| Build da tela (ExtrudeGeometry e rotação) | `src/features/studio/tools/lembrancinhas/termoformador/buildScreen.ts` |
| Dimensões, perfil e LatheGeometry do suporte | `src/features/studio/tools/lembrancinhas/termoformador/buildSupport.ts` |
| Orquestração tela + suporte + seatY | `src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.ts` |
| Validação (issues e severidade) | `src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts` |
| Worker + serialização | `src/features/studio/tools/lembrancinhas/termoformador/buildScreen.worker.ts` |
| Serialização da geometria | `src/features/studio/tools/lembrancinhas/termoformador/workerGeometry.ts` |
| Interface do worker | `src/features/studio/tools/lembrancinhas/termoformador/workerClient.ts` |
| Hook de estado | `src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts` |
| Painel de parâmetros | `src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx` |
| Preview R3F (conjunto montado) | `src/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.tsx` |
| Exportar dois STLs | `src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts` |
| **Caneca Personalizada** | |
| Schema + tipos (faixas, defaults, cores e constantes) | `src/features/studio/tools/lembrancinhas/caneca-personalizada/schema.ts` |
| Perfil do corpo e geometria da alça | `src/features/studio/tools/lembrancinhas/caneca-personalizada/shapes.ts` |
| Corpo por revolução | `src/features/studio/tools/lembrancinhas/caneca-personalizada/buildBody.ts` |
| Relevo do texto curvado | `src/features/studio/tools/lembrancinhas/caneca-personalizada/buildRelief.ts` |
| Alça de abraçadeira + laço | `src/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle.ts` |
| Orquestração corpo + alça (CSG) | `src/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug.ts` |
| Validação (issues e severidade) | `src/features/studio/tools/lembrancinhas/caneca-personalizada/validateMug.ts` |
| Worker + serialização | `src/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug.worker.ts` |
| Serialização das duas peças | `src/features/studio/tools/lembrancinhas/caneca-personalizada/workerGeometry.ts` |
| Interface do worker | `src/features/studio/tools/lembrancinhas/caneca-personalizada/workerClient.ts` |
| Hook de estado | `src/features/studio/tools/lembrancinhas/caneca-personalizada/useMug.ts` |
| Painel de parâmetros | `src/features/studio/tools/lembrancinhas/caneca-personalizada/StudioPanel.tsx` |
| Preview R3F (duas cores) | `src/features/studio/tools/lembrancinhas/caneca-personalizada/MugPreview.tsx` |
| Exportar dois STLs | `src/features/studio/tools/lembrancinhas/caneca-personalizada/exportStl.ts` |

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

## Termoformador (tela + suporte)

Pipeline completo de geração da tela circular e do suporte côncavo:

**useThermoformer.ts** → **buildScreen.worker.ts** → **buildThermoformer.ts** →
**buildScreen.ts** + **buildSupport.ts** → **exportStl.ts**

1. **schema.ts** — Valida diâmetro, espessura, largura do aro, espessura da linha,
   abertura do favo, parâmetros do suporte e cor PLA e concentra
   `MINIMUM_LINE_MM`, `MINIMUM_SUPPORT_MM`, `MAX_SCREEN_OPENINGS` e
   `SCREEN_SEGMENTS`
2. **shapes.ts** — Cria o contorno circular e um `Path` hexagonal por favo, com
   `HEXAGON_ANGLE_EPSILON` para evitar vértices exatamente colineares que abrem
   os caps do Earcut
3. **screenPattern.ts** — Calcula a treliça hexagonal flat-top
   (`spacing = opening + lineWidth`), inclui apenas favos totalmente dentro de
   `diameter/2 - frameWidth` e limita a 4.000 favos, crescendo a abertura 15%
   por iteração
4. **useThermoformer.ts** — Reducer + Zod com clamp dos sliders (debounce de
   250 ms), um worker por build com descarte de respostas obsoletas, validação
   na main thread e `fitRadius` pela esfera envolvente do suporte
5. **buildScreen.worker.ts** — Executa `buildThermoformer` fora da main thread;
   `workerGeometry.ts` serializa as duas peças (position/normal/index) e o
   `seatY` com transferência de buffers
6. **buildThermoformer.ts** — Orquestra `buildScreen` e `buildSupport` e devolve
   `{ screen, support, seatY }`, com `seatY = effectiveBowlDepth + bottomThickness`
7. **buildScreen.ts** — `Shape` circular com furos hexagonais em
   `ExtrudeGeometry`, girado para deitar em XZ com espessura em +Y
8. **buildSupport.ts** — Perfil 2D fechado no plano `(r, y)` (fundo, parede
   externa, aro, parede do rebaixo, degrau e arco esférico) convertido em
   `LatheGeometry` com `SCREEN_SEGMENTS`, sem CSG; os triângulos degenerados do
   eixo são removidos
9. **exportStl.ts** — Baixa dois STLs binários, `<nome>-tela.stl` e
   `<nome>-suporte.stl`, cada peça centralizada na mesa

Detalhes:

- A tela é uma peça independente; o suporte é outra, com bacia esférica fechada
  e fundo fechado. Corpo, tampa, pino e base ficam fora da v1.
- O suporte deriva o diâmetro da tela:
  `recessRadius = diameter/2 + fitClearance` e
  `outerRadius = recessRadius + wallThickness`. O rebaixo tem a espessura da
  tela (`thickness`), então a tela apoia no degrau e fica nivelada com o topo.
- O degrau começa em `recessRadius - stepWidth`; a sobreposição sob a tela é
  `stepWidth - fitClearance` (mínimo 1,4 mm pelos limites do schema) e a
  validação `support-step` é defensiva.
- A profundidade efetiva da bacia é limitada para manter 0,8 mm entre a bacia e
  a parede externa; quando o clamp atua, `support-depth` avisa e `seatY` e
  altura acompanham o valor efetivo.
- A linha padrão é 0,4 mm, equivalente a uma extrusão de bico 0,4 mm; abaixo
  disso a malha fica frágil e a validação avisa.
- O aro sólido tem `frameWidth`; favos parciais são descartados, então a borda
  efetiva pode chegar a `frameWidth + circunraio`.
- Os testes validam a malha com `isClosed` (cada aresta em dois triângulos e
  winding coerente).
- A cor não rebuilda a geometria e é única para as duas peças.
- Configurações extremas (~3.571 favos) levam ~7 s e rodam no worker para não
  travar a UI.

## Caneca Personalizada

Pipeline completo de geração da caneca:

**useMug.ts** → **buildMug.worker.ts** → **buildMug.ts** →
**buildBody.ts** + **buildRelief.ts** + **buildHandle.ts** → **exportStl.ts**

1. **schema.ts** — Valida corpo, alça, personalização e duas cores PLA;
   `mugGeometryParamsSchema` exclui as cores para não rebuildar ao trocar cor.
2. **shapes.ts** — Perfil fechado `(r, y)`, raio externo efetivo até
   `height − chanfro`, contorno da abraçadeira de 200° e laço em D. Concentra
   `getEffectiveRimChamfer`, `getBodyOuterRadius`, `getBandInnerRadius` e
   `getHandleMetrics`.
3. **buildBody.ts** — `LatheGeometry` de 128 segmentos; remove os triângulos
   degenerados do eixo e preserva position/normal/uv.
4. **buildRelief.ts** — `textToShapes`/`shapesToGeometry`, subdivisão conforme
   até 2,5 mm, auto-fit para 120°, curvatura no raio a 180° da alça e 1 mm de
   relevo visível (0,2 mm embutido para a união).
5. **buildHandle.ts** — Abraçadeira com perfil quadrático: folga nominal no
   meio, interferência absoluta de 0,4 mm no topo e folga +0,4 mm na base;
   laço acompanha a conicidade do corpo. Abraçadeira + laço são unidos por CSG.
6. **buildMug.ts** — Une o relevo ao corpo (`ADDITION`, `useCDTClipping`) e
   devolve `{ body, handle }`; limpa triângulos colapsados. Fechamento e
   casca única são verificados nos testes de spike.
7. **useMug.ts** — Reducer + Zod, clamps, debounce de 250 ms, um worker por
   build, descarte de respostas obsoletas, snapshot `builtParams` e descarte da
   geometria anterior.
8. **exportStl.ts** — Dois STLs binários: `<nome>-corpo.stl` e
   `<nome>-alca.stl`; corpo com base em `y = 0`, alça em pé, clonada antes de
   centralizar.

Detalhes:

- O corpo padrão tem 80 × 88 mm, parede 2,4 mm, fundo 3,2 mm e ~338 ml.
- O relevo é unido por `three-bvh-csg` com o splitter CDT; o splitter legado
  deixa T-junctions. O resultado é fechado e single-shell nos extremos de
  tamanho.
- A alça não usa trilho: a abraçadeira abraça o corpo por pressão e é
  removível. Ela imprime em pé, apoiada na borda inferior do laço, com suporte
  sob toda a face inferior do arco de 200°.
- O texto fica sempre a 180° da alça; o auto-fit de 120° mantém a
  personalização longe da abraçadeira.
- Duas cores no preview (`bodyColor`/`accentColor`); trocar cor não rebuilda.
- Validação por códigos: `mug-taper`, `mug-wall`, `mug-bottom`, `mug-text-fit`,
  `mug-text-band`, `mug-handle-gap`, `mug-handle-reach`, `mug-handle-fit`,
  `mug-handle-band` e `mug-capacity`. Falhas de runtime do worker usam
  `mug-invalid`, `mug-font`, `mug-csg` e `mug-build`.
- Build padrão ~0,6 s no worker (fonte carregada); 20 caracteres em 18 mm
  levam ~2,4 s. O teste roda no processo do Vitest, inclui a fonte e as
  asserções (~1,2–1,6 s no default) e usa gate de 4 s.

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
- **Termoformador (tela + suporte):** Duas peças independentes. A tela é um disco circular com aro sólido e malha hexagonal flat-top em `ExtrudeGeometry` com furos hexagonais, sem CSG, validado por teste de malha fechada; favos limitados a 4.000, com abertura crescendo 15% ao exceder, e epsilon de 0,001 rad por favo evita caps abertos no Earcut. O suporte é um berço côncavo de `LatheGeometry` com perfil fechado, bacia esférica e fundo fechado, sem CSG e com os triângulos degenerados do eixo removidos. O diâmetro do suporte deriva da tela (`recessRadius = D/2 + fitClearance`, `outerRadius = recessRadius + wallThickness`); a tela apoia no degrau e fica nivelada com o topo. A profundidade efetiva da bacia é limitada para manter 0,8 mm de parede externa. Preview montado com a tela em `seatY`, cor única e export de dois STLs `-tela` e `-suporte`. `fitRadius` usa a esfera envolvente do suporte. Build em worker; a configuração máxima do schema leva ~7 s.
- **Caneca Personalizada:** Corpo de parede simples em `LatheGeometry` com perfil fechado, sem trilho; nome em relevo de 1 mm curvado no raio e unido por CSG com o splitter CDT, a 180° da alça. Alça separada de encaixe por pressão: abraçadeira em C de 200° com folga nominal no meio, interferência absoluta de 0,4 mm no topo e laço em D; abraçadeira e laço são unidos por CSG dentro da alça. Duas cores (`bodyColor`/`accentColor`), dois STLs `-corpo` e `-alca`, build em worker. A alça imprime em pé com suporte sob o arco; o corpo imprime em pé sem suporte. O relevo usa subdivisão conforme de 2,5 mm para manter 1 mm no centro de glifos largos.

## Próximos passos (fora de escopo desta fase)

- Autenticação (Authenticator + rota protegida)
- Geração real via CadQuery (Sprint 2)
- Exportar STL e salvar projeto
- Drawer de parâmetros no mobile

## Testes

`tests/features/studio/` cobre config, hook, componentes e composição da página.
Rodar: `npm run test`.