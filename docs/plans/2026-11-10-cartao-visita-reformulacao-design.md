# Design: Reformulação do Cartão de Visita

**Data:** 10 de novembro de 2026
**Status:** Aprovado
**Categoria:** Letreiros
**Ferramenta:** cartao-visita

## 1. Visão Geral

Reformular o Cartão de Visita sobre a arquitetura do Chaveiro, preservando a
identidade do produto: uma peça plana, retangular e com cantos arredondados,
sem furo/argola.

O conteúdo passa a ser uma lista de 1–3 itens livres, cada um do tipo **texto**
ou **ícone SVG** (logo). Os itens são posicionados pelo editor 2D com
auto-ajuste à área útil do cartão. Texto e ícone são sempre elevados em 1 mm.

O modelo atual (três blocos fixos, `layout` centralizado/à esquerda e relevo por
item) é removido.

## 2. Requisitos Funcionais

### Conteúdo por item

- Cada item é exclusivamente texto ou ícone SVG.
- Texto:
  - sem limite de caracteres;
  - acentos removidos automaticamente (as fontes normal/bold não têm glifos
    acentuados);
  - estilo normal, negrito ou serifada;
  - tamanho de fonte 3–12 mm;
  - offsets X/Y de −40 a 40 mm.
- Ícone:
  - upload de SVG de até 1 MB;
  - escala 0,5–1,0×;
  - espessura de linha 0,1–1,5 mm;
  - offsets X/Y de −40 a 40 mm.
- 1–3 itens por cartão.
- Itens são posicionados livremente pelo editor 2D.

### Auto-ajuste

- Texto e ícone são reduzidos (nunca ampliados) para caber na área útil.
- A área útil é o retângulo interno recuado em 3 mm (`CONTENT_MARGIN`).
- A profundidade (Z) nunca é escalada.
- Offsets são limitados à área útil.
- Textos longos são reduzidos até caber, sem piso de tamanho. O painel informa
  que a redução é automática.

### Relevo

- Conteúdo sempre elevado com profundidade fixa `CONTENT_DEPTH = 1` mm.
- Não há seletor de elevado/gravado nem profundidade configurável.

### Forma e dimensões

- Cartão retangular com cantos arredondados ajustáveis (0–10 mm).
- Largura 50–90 mm (padrão 85 mm).
- Altura 30–60 mm (padrão 55 mm).
- Espessura 1–3 mm (padrão 2 mm).
- Sem furo, argola ou cavidade.

### Aparência

- Duas cores PLA: base e conteúdo (texto/ícone).
- Preview 3D com dois materiais.
- Troca de cor não reconstrói a geometria.

### Exportação

- STL binário, mesclando base + conteúdo quando houver conteúdo.
- Nome do arquivo derivado do nome do projeto.

## 3. Arquitetura

```
src/features/studio/tools/letreiros/cartao-visita/
├── schema.ts              — validação Zod + defaults (contents discriminados)
├── shapes.ts              — Shape do cartão com cantos arredondados
├── autoFit.ts             — área útil, encaixe e clamp
├── textToGeometry.ts      — TextGeometry + normalização de acentos
├── buildCard.ts           — composição base + conteúdo (merge)
├── buildCard.worker.ts    — build em Web Worker
├── workerClient.ts        — client do Worker
├── workerGeometry.ts      — serialização do resultado
├── exportStl.ts           — STL binário + download
├── useCard.ts             — estado + parse SVG + worker + debounce
├── StudioPanel.tsx        — painel de parâmetros
├── CardPreview.tsx        — preview R3F com 2 materiais
└── TextPositionEditor.tsx — editor 2D SVG de posicionamento
```

Reutiliza:

- `confeitaria/shared/svgToIconShape.ts` para parse, bounds, escala,
  engrossamento de traço e geometria de ícone;
- `confeitaria/shared/workerGeometry.ts` para serialização da geometria;
- `chaveiros/chaveiro/fonts.ts` para os URLs das fontes (padrão já usado pelo
  cartão).

## 4. Schema de Parâmetros

```ts
export const CONTENT_DEPTH = 1
export const CONTENT_MARGIN = 3
export const BASE_BEVEL = 0.1

export const textContentSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('text'),
  content: z.string().trim(),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(3).max(12),
  offsetX: z.number().min(-40).max(40),
  offsetY: z.number().min(-40).max(40),
})

export const iconContentSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('icon'),
  svgIcon: z.string().min(1).nullable(),
  iconScale: z.number().min(0.5).max(1),
  iconLineWidth: z.number().min(0.1).max(1.5),
  offsetX: z.number().min(-40).max(40),
  offsetY: z.number().min(-40).max(40),
})

export const contentItemSchema = z.discriminatedUnion('kind', [
  textContentSchema,
  iconContentSchema,
])

export const cardParamsSchema = z.object({
  productType: z.literal('card'),
  width: z.number().min(50).max(90),
  height: z.number().min(30).max(60),
  thickness: z.number().min(1).max(3),
  cornerRadius: z.number().min(0).max(10),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  contents: z.array(contentItemSchema).min(1).max(3),
})
```

Defaults:

- `Seu Nome` — bold, 7 mm, `offsetY = 10`.
- `Seu Cargo` — normal, 4 mm, `offsetY = 0`.
- `seu@email.com` — normal, 3 mm, `offsetY = -10`.

## 5. Auto-fit e Posicionamento

- `getUsableRegion(params)` retorna sempre um retângulo:
  - `minX = -width/2 + CONTENT_MARGIN`
  - `maxX = width/2 - CONTENT_MARGIN`
  - `minY = -height/2 + CONTENT_MARGIN`
  - `maxY = height/2 - CONTENT_MARGIN`

- `fitGeometryToRegion(geometry, region)`:
  - calcula a escala `min(1, larguraRegiao/largura, alturaRegiao/altura)`;
  - aplica escala apenas em X/Y;
  - normaliza Z para começar em 0;
  - centraliza a geometria no centro da região (origem).

- `clampOffset(region, halfWidth, halfHeight, offset)` mantém o item inteiro
  dentro da região.

- Texto é gerado com `fontSize` em mm e só encolhe quando necessário.
- Ícone usa `buildSvgIconGeometryInBoxFromParsed` com a largura/altura da região.
- O build grava `halfWidth`/`halfHeight` reais em `contentItems` para o editor.

## 6. Pipeline de Build

1. Cria a base com `createCardShape(width, height, cornerRadius)` e extrudа em
   `thickness` com bevel de `BASE_BEVEL`.
2. Para cada item:
   - resolve a fonte do estilo (texto) ou o SVG parseado (ícone);
   - gera a geometria com `CONTENT_DEPTH`;
   - aplica auto-fit e clamp;
   - traduz para o offset e para `z = thickness + BASE_BEVEL − 0.01`.
3. Mescla as geometrias de conteúdo em `content`.
4. Calcula normais e devolve `{ base, content, contentItems }`.

O build roda em Web Worker:

- **main thread** (`useCard.ts`) parseia cada SVG e envia
  `{ params, parsedSvgs, styles }`;
- **worker** carrega as fontes necessárias e chama `buildCard`;
- `workerGeometry.ts` serializa o resultado de volta;
- `isBuilding` alimenta “Gerando…”, `error` aparece no overlay e a geometria
  anterior permanece visível durante o rebuild;
- respostas de worker obsoleto são ignoradas.

## 7. UI e Estado

### Painel

1. **Conteúdo** — chips 1–3 itens, tipo texto/ícone, campos condicionais,
   upload/remoção de SVG, botão “Posicionar conteúdos”.
2. **Cartão** — largura, altura, espessura e cantos arredondados.
3. **Aparência** — cor da base e do conteúdo.

Notas:

- “Textos e ícones elevados em 1 mm.”
- “Textos longos são reduzidos automaticamente.”

### Hook

- Ações: `update`, `updateContent`, `setContentType`, `addContent`,
  `removeContent`, `reset`.
- `addContent` retorna o id criado.
- Fontes carregadas apenas para os estilos usados.
- Debounce de 200 ms.

### Editor 2D

- SVG com o contorno real do cartão e 5 mm de padding.
- Área útil tracejada.
- Caixas dos conteúdos com as medidas reais do build.
- Arraste por pointer/touch, limiar de 0,5 mm e listeners no `document`.
- Conversão de coordenadas com `getScreenCTM` e fallback para
  `getBoundingClientRect`; eixo Y invertido.
- Clamp por `clampOffset` com as meias-extensões reais.
- Teclado: cada conteúdo é um `<g role="button" tabIndex={0}>`; setas movem
  1 mm com clamp.
- Fechamento por `Escape`, clique no fundo, botão X e **Concluir**.
- Foco inicial no botão de fechar; diálogo com `role="dialog"`,
  `aria-modal` e `aria-labelledby`.
- Fallback de meias-extensões quando a geometria ainda não chegou.

## 8. Integração

`StudioPage` (`CartaoVisitaToolWrapper`):

- mantém `selectedContentId` e `isEditorOpen`;
- passa `geometry`, `isBuilding` e `error` do `useCard`;
- overlay de “Gerando…”/erro com `role="status"`/`role="alert"`;
- `aria-busy` no viewport durante o build;
- exporta via `exportStl(geometry, projectName)`;
- painel recebe `onOpenEditor` e ações de conteúdo;
- editor recebe `params`, `geometry`, `selectedContentId`, `onSelectContent`,
  `onMoveContent` e `onClose`.

## 9. Testes

- **Schema:** defaults, 1–3 itens, ausência de `layout`/`textMode`/`relief`,
  ranges, texto sem máximo, PLA e `productType`.
- **Auto-fit:** área útil, nunca amplia, clamp de offsets, texto e ícone.
- **Build:** dimensões, cantos, espessura, base sem fonte, conteúdo mesclado,
  profundidade fixa de 1 mm e posicionamento clampado.
- **WorkerGeometry:** round-trip de base, conteúdo e `contentItems`.
- **Export:** merge base + conteúdo e download do STL.
- **Hook:** defaults, atualização de parâmetros/conteúdo, troca de tipo,
  adicionar/remover, reset, build no worker, resposta obsoleta e erro de SVG.
- **Painel:** chips, tipo, upload, sliders condicionais, adicionar/remover,
  abrir editor e ausência das seções Layout/Relevo.
- **Editor:** SVG, contorno, área útil, arraste, nudge, seleção, clamp,
  fechamento e foco.
- **Integração:** repasse de geometria, estado de build e exportação.

## 10. Documentação

Atualizar:

- `src/features/studio/tools/letreiros/cartao-visita/AGENTS.md`;
- `src/features/studio/tools/letreiros/AGENTS.md`;
- `docs/frontend/studio.md`.

## 11. Decisões

- Modelo livre em vez de blocos fixos: paridade com o chaveiro e liberdade de
  layout.
- Sem limite de texto: o auto-fit é a única regra de encaixe.
- Sem piso de fonte: o preview mostra o resultado real e evita truncamentos.
- Relevo fixo de 1 mm: leitura tátil e paridade com o chaveiro atual.
- Sem argola: o cartão é uma peça plana.
- `contentItems` com medidas reais: o editor não usa caixas aproximadas.
- Duas cores no preview: base + conteúdo, sem rebuild ao trocar cor.

## 12. Fora de Escopo

- Persistência, backend, autenticação e pagamentos.
- Novos formatos de cartão (circular/oval) e cavidade para ímã.
- Alteração das demais ferramentas.
- Unificação das ferramentas chaveiro e cartão.
