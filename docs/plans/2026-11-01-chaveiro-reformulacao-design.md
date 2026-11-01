# Design: Reformulação do Chaveiro com Recursos de Carimbo

**Data:** 2026-11-01
**Status:** Aprovado
**Ferramenta:** Studio 3D > Chaveiros > Chaveiro

---

## 1. Visão Geral

Reformular o chaveiro para incorporar recursos do Carimbo de Brigadeiro, mantendo a identidade do produto (argola, formatos e múltiplos itens posicionáveis). O conteúdo passa a ser uma lista de 1–3 itens, cada um do tipo **texto** ou **ícone SVG**, com auto-ajuste à área útil do formato.

O Carimbo de Brigadeiro continua existindo como ferramenta separada.

---

## 2. Requisitos Funcionais

### Conteúdo por item
- Cada item é exclusivamente texto **ou** ícone SVG.
- Texto: conteúdo 1–12 caracteres, estilo (normal/bold/serif) e tamanho de fonte 6–15mm.
- Ícone: upload de SVG, escala 0.5–1.0x e espessura de linha 0.1–1.5mm.
- 1–3 itens por peça, posicionáveis no editor 2D.

### Auto-ajuste
- Texto e ícone são reduzidos (nunca ampliados) para caber na região útil do formato.
- Região útil:
  - Retângulo: área interna à `borderWidth`.
  - Círculo: raio `width/2 - borderWidth`.
  - Coração: círculo inscrito conservador menos `borderWidth`.
  - Contorno do nome: sem região — o conteúdo define o contorno.
- A profundidade do relevo (Z) nunca é escalada.
- Offsets são clampados dentro da região útil e respeitam a folga da argola.

### Relevo
- Modo global elevado/gravado para todos os itens.
- Profundidade global `reliefDepth` 0.4–2mm (padrão 1mm).
- Gravação rasa a partir da face frontal.

### Formato "Contorno do Nome"
- A base é o contorno da **união** dos textos e ícones.
- `borderWidth` controla a dilatação do contorno.
- Argola ancorada fora da bounding box da união.

### Demais parâmetros
- Formatos: retângulo, círculo, coração e contorno do nome.
- Dimensões da base, espessura, borda, argola e cores PLA mantidos.

---

## 3. Arquitetura

```
src/features/studio/tools/chaveiros/chaveiro/
├── schema.ts          — ContentItem (união discriminada) + params
├── autoFit.ts         — região útil, encaixe e clamp por formato
├── shapes.ts          — formas base + furo + argola
├── textToGeometry.ts  — TextGeometry
├── nameOutline.ts     — contorno da união de shapes
├── buildKeychain.ts   — composição base + conteúdo (merge/CSG)
├── positioning.ts     — clamp de borda/furo
├── exportStl.ts       — STL binário + download
├── fonts.ts           — mapa estilo → typeface.json
├── useKeychain.ts     — estado + fontes lazy + debounce
├── StudioPanel.tsx    — painel de parâmetros
├── KeychainPreview.tsx— preview R3F
└── TextPositionEditor.tsx — editor 2D SVG
```

Reutiliza `confeitaria/shared/svgToIconShape.ts` para parsing, engrossamento de traços e encaixe de ícones.

### Pipeline

`schema.ts` → `autoFit.ts` / `shapes.ts` → `textToGeometry.ts` → `buildKeychain.ts` → `exportStl.ts`

`buildKeychain` retorna `{ base, content, contentItems, pieceBB, hole }`. `contentItems` carrega `halfWidth/halfHeight` reais para o editor.

---

## 4. Schema de Parâmetros

```ts
textContentSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('text'),
  content: z.string().trim().min(1).max(12),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(6).max(15),
  offsetX: z.number().min(-20).max(20),
  offsetY: z.number().min(-20).max(20),
})

iconContentSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('icon'),
  svgIcon: z.string().nullable(),
  iconScale: z.number().min(0.5).max(1.0),
  iconLineWidth: z.number().min(0.1).max(1.5),
  offsetX: z.number().min(-20).max(20),
  offsetY: z.number().min(-20).max(20),
})

contentItemSchema = z.discriminatedUnion('kind', [textContentSchema, iconContentSchema])

keychainParamsSchema = z.object({
  productType: z.literal('keychain'),
  textMode: z.enum(['raised', 'engraved']),
  baseShape: z.enum(['rect', 'circle', 'heart', 'name']),
  width: z.number().min(20).max(80),
  height: z.number().min(20).max(80),
  borderWidth: z.number().min(4).max(10),
  thickness: z.number().min(2).max(6),
  reliefDepth: z.number().min(0.4).max(2),
  ringPosition: z.enum(['top', 'bottom', 'left', 'right']),
  ringInnerDiameter: z.number().min(3).max(10),
  ringEmbedding: z.number().min(0).max(3),
  ringLateralOffset: z.number().min(-10).max(10),
  ringRadialOffset: z.number().min(0).max(5),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  contents: z.array(contentItemSchema).min(1).max(3),
})
```

---

## 5. Motor de Auto-fit

- `getUsableRegion(params)` retorna `rect` ou `circle` (ou `null` para `name`).
- `fitGeometryToRegion(geometry, region)`:
  - retângulo: `min(1, larguraRegiao/largura, alturaRegiao/altura)`.
  - círculo: `min(1, 2*raio/hipotenusa)`.
  - normaliza Z para começar em 0.
- `clampOffset(region, halfWidth, halfHeight, offset)` mantém o item dentro da região.
- Texto é gerado em `fontSize` mm e só encolhe se necessário.
- Ícone usa `buildSvgIconGeometry` (círculo) ou `buildSvgIconGeometryInBox` (retângulo).
- No formato nome, ícones usam como referência o `fontSize` do primeiro texto (ou 10mm).

---

## 6. Pipeline de Build

### Formatos retângulo/círculo/coração
1. Base + reforço extrudados em `thickness`.
2. Cada item gera geometria ajustada e posicionada.
3. `raised`: merge de base + conteúdo em `thickness - 0.01`.
4. `engraved`: CSG subtrai o conteúdo, posicionado em `thickness - reliefDepth + epsilon`.

### Formato contorno do nome
1. Gera shapes de cada item (texto via `font.generateShapes`, ícone via `svgShapesFromParsed`).
2. Une os shapes via Clipper.
3. Dilata em `borderWidth` e extrudа a base em `thickness`.
4. Camada de conteúdo é a união extrudada em `reliefDepth`.
5. `raised` mescla; `engraved` subtrai.

---

## 7. UI e Estado

### Painel
1. **Conteúdo** — chips 1–3 itens; tipo Texto/Ícone; controles condicionais; botão Posicionar.
2. **Formato** — forma, dimensões, espessura e borda.
3. **Relevo** — elevado/gravado + profundidade.
4. **Argola** — posição, diâmetro, embutimento.
5. **Aparência** — cor da base e das letras.

### Hook
- Ações: `update`, `updateContent`, `setContentType`, `addContent`, `removeContent`, `reset`.
- Fontes lazy apenas para estilos de itens de texto.
- Debounce de 200ms no build.

### Editor
- Renderiza a caixa real ajustada de cada item.
- Ícones exibidos como placeholder "ícone".
- Clamp por região útil (retângulo/círculo) e por bounding box no formato nome.

---

## 8. Testes

- Schema: união discriminada, ranges de fonte, 1–3 itens.
- Auto-fit: região por formato, nunca amplia, offsets clampados.
- Ícone: parsing, caixa e espessura mínima.
- Build: texto, ícone, elevado/gravado, pincel CSG dentro da base, união texto+ícone no nome.
- Hook: adicionar/trocar/remover/atualizar itens.
- Painel: toggle de tipo, upload SVG, sliders condicionais.
- Editor: caixa de ícone e movimento clampado.
- Export: base + content e base sozinha.

---

## 9. Decisões

- União discriminada em vez de campos opcionais: evita estados inválidos.
- `reliefDepth` global em vez de relevo por item: alinhado ao modo global do carimbo.
- `width/height` do item substituídos por `fontSize`: o auto-fit garante o encaixe.
- Formato nome une texto e ícone: o contorno representa todo o conteúdo da peça.
- Carimbo permanece separado.

## 10. Fora de escopo

- Persistência, backend, autenticação e pagamentos.
- Unificação das ferramentas chaveiro e carimbo.
