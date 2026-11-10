# Design: Reformulação do Suporte para Foto

**Data:** 10 de novembro de 2026
**Status:** Aprovado
**Categoria:** Letreiros
**Ferramenta:** suporte-foto

## 1. Visão Geral

Reformular o Suporte para Foto sobre a arquitetura do Chaveiro, como já foi
feito no Cartão de Visita. A peça deixa de ser "duas metades de texto
inclinadas" e passa a ser um **suporte de mesa funcional**:

- peça única, obtida pela extrusão de um **perfil lateral** na largura da foto;
- base plana horizontal, com uma **faixa frontal** vertical que recebe o
  conteúdo (texto/ícone) em relevo de 1 mm;
- **fenda** de 2 mm entre a faixa e um **painel inclinado** atrás, onde a foto
  encaixa e se apoia;
- 1–3 conteúdos livres, posicionados pelo editor 2D, com auto-fit na faixa.

A reformulação também fecha as lacunas do modelo atual: não havia fenda real,
exportação STL nem build em Worker.

## 2. Requisitos Funcionais

### Foto

- Tamanhos: 10×15 cm (100 mm), 13×18 cm (130 mm) e 15×20 cm (150 mm).
- Largura do suporte `W = largura da foto + 2 × sideMargin` (3–20 mm).
- Fenda fixa: 2 mm de vão entre a faixa e o painel.
- A borda inferior da foto fica apoiada na placa e coberta pela faixa em
  `bandHeight − thickness` (≈ 22 mm no padrão).
- Inclinação do painel ajustável de 60° a 85° (padrão 75°).
- Ângulos menores exigem base mais profunda para a peça não tombar.

### Conteúdo

- 1–3 itens, cada um exclusivamente texto ou ícone SVG.
- Texto: sem limite de caracteres, acentos removidos automaticamente, estilos
  normal/negrito/serifada, fonte 3–15 mm.
- Ícone: upload de SVG até 1 MB, escala 0,5–1,0×, linha 0,1–1,5 mm.
- Relevo fixo de `CONTENT_DEPTH = 1` mm.
- Auto-fit só reduz (nunca amplia) a partir da área útil da faixa, recuada em
  `CONTENT_MARGIN = 3` mm.
- Offsets clampados à área útil; posicionamento livre pelo editor 2D.

### Base

- Altura da faixa 15–40 mm (padrão 25).
- Profundidade da base 30–60 mm (padrão 40).
- Espessura de placa/faixa/painel 2–4 mm (padrão 3).

### Aparência

- Duas cores PLA: base e conteúdo.
- Preview 3D com dois materiais.
- Trocar cor não reconstrói a geometria.

### Exportação

- STL binário, mesclando base + conteúdo quando houver conteúdo.
- Nome do arquivo derivado do nome do projeto.

## 3. Geometria

### Perfil lateral

Tudo é definido por um polígono único no plano lateral (frente em `z = 0`,
base em `y = 0`), extrudado na largura `W`. Não há CSG, então a peça é manifold
por construção.

```
 frente
 ┌──┐                    ╱
 │  │  fenda 2 mm       ╱
 │  │◄┤                ╱
 │  │ │               ╱
 ┴──┴─┴───────────────┴────────  base (D)
```

Vértices do perfil, em ordem:

```
(0, 0)                         base frontal
(0, H)                         topo da face de conteúdo
(T, H)                         topo da faixa
(T, T)                         base da faixa
(T + 2, T)                     fundo da fenda
(T + 2 + run, H)               topo da face inclinada do painel
(ribBack, H)                   topo do painel
(ribBack, T)                   base do painel
(D, T)                         topo da placa até a traseira
(D, 0)                         base traseira
```

Onde:

- `T = thickness`
- `run = (H − T) / tan(angle)`
- `ribBack = T + SLOT_GAP + run + T`
- `D = max(depth, ribBack + PLATE_REAR_MIN)` — profundidade efetiva, para nunca
  degenerar o perfil.

A face frontal (`z = 0`, `0 ≤ y ≤ H`) é a área do conteúdo. A foto entra pela
fenda de 2 mm, apoia a borda inferior no topo da placa (`y = T`) e encosta na
face inclinada do painel, que define o ângulo `angle` com a horizontal.

### Extrusão e orientação final

1. O perfil é construído no plano XY com `x` espelhando a profundidade
   (`x = −z`), para que a extrusão (`+Z`, `depth = W`) fique ao longo da
   largura.
2. `rotateY(−π/2)`: largura passa para X, profundidade para Z.
3. `translate(W/2, −H/2, D/2)`: geometria centrada em X/Y/Z, com a face do
   conteúdo em `z = +D/2` voltada para a câmera.
4. Sem bevel (`bevelEnabled: false`) para evitar autointerseção na fenda.

### Conteúdo

- Gerado no plano XY e extrudado em `+Z` por 1 mm.
- Posicionado em `z = D/2 − 0.01`, sobre a face frontal.
- Auto-fit dentro do retângulo `W × H` recuado 3 mm.

### Estabilidade

A foto inclinada desloca o centro de massa para trás. Com os padrões
(150 mm de foto, 75°), o centro de massa fica a ≈ 21 mm da frente, dentro dos
40 mm da base. Ângulos menores exigem profundidade maior; o painel avisa o
usuário, sem travar a combinação.

## 4. Arquitetura

```
src/features/studio/tools/letreiros/suporte-foto/
├── schema.ts                — Zod + defaults + PLA + sanitizeFilename
├── shapes.ts                — perfil lateral, extrusão e medidas derivadas
├── autoFit.ts               — área útil, auto-fit e clamp
├── textToGeometry.ts        — TextGeometry + normalização de acentos
├── buildPhotoStand.ts       — composição base + conteúdo (merge)
├── buildPhotoStand.worker.ts — build em Web Worker
├── workerClient.ts          — client do Worker
├── workerGeometry.ts        — serialização { base, content, contentItems }
├── exportStl.ts             — STL binário (merge base + conteúdo) + download
├── usePhotoStand.ts         — estado + parse SVG + worker + debounce
├── StudioPanel.tsx          — painel (Conteúdo, Foto, Base, Aparência)
├── PhotoStandPreview.tsx    — preview R3F com 2 materiais
└── PhotoPositionEditor.tsx  — editor 2D da faixa
```

Reutiliza:

- `confeitaria/shared/svgToIconShape.ts` — parse, bounds, escala, linha e
  geometria de ícone;
- `confeitaria/shared/workerGeometry.ts` — serialização da geometria;
- `chaveiros/chaveiro/fonts.ts` — URLs das fontes.

Os arquivos `buildPhotoStand.ts`, `usePhotoStand.ts` e `StudioPanel.tsx` do
modelo antigo são substituídos por completo (nada do desenho anterior é
mantido).

## 5. Schema de Parâmetros

```ts
export const CONTENT_DEPTH = 1
export const CONTENT_MARGIN = 3
export const SLOT_GAP = 2
export const PLATE_REAR_MIN = 2

export const PHOTO_SIZES = {
  '10x15': { width: 100, height: 150 },
  '13x18': { width: 130, height: 180 },
  '15x20': { width: 150, height: 200 },
} as const

export const textContentSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('text'),
  content: z.string(),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(3).max(15),
  offsetX: z.number().min(-90).max(90),
  offsetY: z.number().min(-25).max(25),
})

export const iconContentSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('icon'),
  svgIcon: z.string().min(1).nullable(),
  iconScale: z.number().min(0.5).max(1),
  iconLineWidth: z.number().min(0.1).max(1.5),
  offsetX: z.number().min(-90).max(90),
  offsetY: z.number().min(-25).max(25),
})

export const photoStandParamsSchema = z.object({
  productType: z.literal('photo-stand'),
  photoSize: z.enum(['10x15', '13x18', '15x20']),
  sideMargin: z.number().min(3).max(20),
  bandHeight: z.number().min(15).max(40),
  depth: z.number().min(30).max(60),
  thickness: z.number().min(2).max(4),
  angle: z.number().min(60).max(85),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  contents: z.array(contentItemSchema).min(1).max(3),
})
```

Defaults:

- `photoSize = '10x15'`, `sideMargin = 10`, `bandHeight = 25`, `depth = 40`,
  `thickness = 3`, `angle = 75`.
- `baseColor = '#14b8a6'`, `letterColor = '#f5f5f5'`.
- Um conteúdo: `Família` — bold, 10 mm, centralizado.

## 6. Auto-fit e Posicionamento

- `getUsableRegion(params)` retorna o retângulo da faixa menos 3 mm:
  `halfWidth = W/2 − 3`, `halfHeight = H/2 − 3`.
- `fitGeometryToRegion` calcula `min(1, largura/região, altura/região)`, escala
  só em X/Y, normaliza Z e centraliza.
- `clampOffset` mantém o item inteiro dentro da região.
- O build grava `halfWidth`/`halfHeight` reais em `contentItems` para o editor.

## 7. Pipeline de Build

1. `createStandGeometry(params)` gera a base (perfil + extrusão).
2. Para cada item: resolve a fonte do estilo (texto) ou o SVG parseado (ícone),
   gera a geometria com `CONTENT_DEPTH`, aplica auto-fit e clamp, e translada
   para `(x, y, D/2 − 0.01)`.
3. Mescla os conteúdos e devolve `{ base, content, contentItems }`.

O build roda em Web Worker:

- **main thread** (`usePhotoStand.ts`) parseia cada SVG e envia
  `{ params, parsedSvgs, styles }`;
- **worker** carrega as fontes necessárias e chama `buildPhotoStand`;
- `workerGeometry.ts` serializa o resultado de volta;
- respostas de worker obsoleto são ignoradas;
- `isBuilding` alimenta “Gerando…”, `error` aparece no overlay e a geometria
  anterior permanece visível durante o rebuild;
- trocar cor não reconstroi a peça.

## 8. UI e Estado

### Painel

1. **Conteúdo** — chips 1–3, tipo, campos condicionais, upload/remoção de SVG,
   botão “Posicionar conteúdos”.
   Nota: “Textos e ícones elevados em 1 mm.”
2. **Foto** — tamanho, margem lateral e inclinação.
   Notas: “A faixa cobre a borda inferior da foto.” e “Ângulos menores exigem
   base mais profunda.”
3. **Base** — altura da faixa, profundidade e espessura.
4. **Aparência** — cor da base e do conteúdo.

### Hook

- Ações: `update`, `updateContent`, `setContentType`, `addContent`,
  `removeContent`, `reset`.
- `addContent` retorna o id criado.
- Fontes carregadas apenas para os estilos usados.
- Debounce de 200 ms.
- `dimensions` = `W × H × D` efetivos; `fitRadius` derivado da caixa
  envolvente.

### Editor 2D

- SVG com o retângulo real da faixa (`W × H`) e 5 mm de padding.
- Área útil tracejada.
- Caixas com as medidas reais do build.
- Arraste por pointer/touch, limiar de 0,5 mm, listeners no `document`.
- Conversão por `getScreenCTM` com fallback para `getBoundingClientRect`;
  eixo Y invertido.
- Clamp por `clampOffset` com as meias-extensões reais.
- Teclado: cada conteúdo é um `<g role="button" tabIndex={0}>`; setas movem
  1 mm com clamp.
- Fechamento por `Escape`, clique no fundo, botão X e **Concluir**.
- Foco inicial no botão de fechar; `role="dialog"`, `aria-modal` e
  `aria-labelledby`.
- Fallback de meias-extensões quando a geometria ainda não chegou.

## 9. Integração

`StudioPage` (`SuporteFotoToolWrapper`) espelha o `CartaoVisitaToolWrapper`:

- mantém `selectedContentId` e `isEditorOpen`;
- overlay de “Gerando…”/erro com `role="status"`/`role="alert"`;
- `aria-busy` no viewport durante o build;
- exporta via `exportStl(geometry, projectName)`;
- painel recebe `onOpenEditor` e ações de conteúdo;
- editor recebe `params`, `geometry`, `selectedContentId`, `onSelectContent`,
  `onMoveContent` e `onClose`;
- viewport recebe `cameraPosition` e `fitRadius` para enquadrar a peça.

## 10. Testes

- **Schema:** defaults, 1–3 itens, ranges, texto sem limite, PLA,
  `productType`.
- **Shapes:** largura derivada, profundidade efetiva, perfil fechado, fenda de
  2 mm, ângulo, dimensões da geometria extrudada, manifold básico.
- **Auto-fit:** área útil, nunca amplia, clamp de offsets, texto e ícone.
- **Build:** dimensões, fenda, painel, conteúdo mesclado, relevo de 1 mm,
  posicionamento clampado.
- **WorkerGeometry:** round-trip de base, conteúdo e `contentItems`.
- **Export:** merge base + conteúdo e download do STL.
- **Hook:** defaults, atualização de parâmetros/conteúdo, troca de tipo,
  adicionar/remover, reset, build no worker, resposta obsoleta, erro de SVG e
  cor sem rebuild.
- **Painel:** chips, tipo, upload, sliders condicionais, adicionar/remover,
  abrir editor e notas.
- **Editor:** retângulo da faixa, área útil, arraste, nudge, seleção, clamp,
  fechamento e foco.
- **Integração:** repasse de geometria, estado de build e exportação.

## 11. Documentação

Atualizar:

- `src/features/studio/tools/letreiros/suporte-foto/AGENTS.md`;
- `src/features/studio/tools/letreiros/AGENTS.md`;
- `docs/frontend/studio.md`.

## 12. Decisões

- Perfil lateral extrudado em vez de CSG: manifold por construção e sem
  dependência extra.
- Faixa frontal vertical: o texto fica em pé, legível, com o editor 2D
  mapeando diretamente a face.
- Fenda fixa de 2 mm e ângulo ajustável: menos parâmetros, uso real garantido.
- A faixa cobre a borda inferior da foto: mesmo compromisso de uma moldura, e
  a altura da faixa controla quanto.
- Conteúdo livre 1–3 com auto-fit: paridade com o chaveiro/cartão e liberdade
  de layout.
- Relevo fixo de 1 mm e duas cores no preview: leitura tátil e sem rebuild ao
  trocar cor.
- `contentItems` com medidas reais: editor sem caixas aproximadas.

## 13. Fora de Escopo

- Persistência, backend, autenticação e pagamentos.
- Múltiplas fotos, molduras com janela, peças articuladas ou encaixáveis.
- Rotação de conteúdo, formatos circulares.
- Cavidade/ímã, pés antiderrapantes.
- Alteração das demais ferramentas.
