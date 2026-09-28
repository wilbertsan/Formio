# Design: Topo de Bolo

**Data:** 31 de agosto de 2026  
**Status:** Aprovado  
**Categoria:** Confeitaria  
**Ferramenta:** topo-bolo

## Visão Geral

Ferramenta do Studio 3D para gerar toppers decorativos para bolo com texto personalizado e ícones SVG. A peça consiste em uma placa com formato (circular, retangular ou oval), texto em relevo, ícone opcional (upload SVG) e pé integrado para fixação no bolo.

## Conceito

O topo de bolo combina personalização de texto com ícones vetoriais para criar toppers decorativos profissionais. O pé integrado (trapezoidal) permite fixação direta no bolo sem necessidade de palitos adicionais.

## Decisões de Design

### Público-Alvo

**Escolhido:** Ambos (confeiteiros profissionais + clientes finais)

- Interface simples para iniciantes
- Controles avançados para profissionais
- Qualidade visual como critério principal de sucesso

### Abordagem de Implementação

**Escolhida:** Upload SVG (Abordagem A)

- Usuário faz upload de arquivo SVG
- SVG é parseado com `SVGLoader` do Three.js
- Paths convertidos em `Shape` → `ExtrudeGeometry`
- Qualidade vetorial mantida (escalável sem perda)

**Rejeitadas:**
- Upload PNG + vectorização: complexidade alta, resultado imperfeito
- Biblioteca de ícones pré-definidos: menos personalização

### Parâmetros Configuráveis

| Parâmetro | Tipo | Range | Default | Descrição |
|-----------|------|-------|---------|-----------|
| text | string | 1-40 chars | "Feliz Aniversário" | Texto principal do topper |
| fontStyle | enum | normal, bold, serif | bold | Estilo da fonte |
| fontSize | number | 8-20mm | 12mm | Altura das letras |
| shape | enum | circle, rectangle, oval | circle | Formato do topper |
| width | number | 50-120mm | 80mm | Largura do topper |
| height | number | 30-80mm | 50mm | Altura do topper (sem o pé) |
| thickness | number | 2-4mm | 3mm | Espessura da placa |
| svgIcon | string \| null | — | null | SVG parseado do upload (conteúdo raw) |
| iconPosition | enum | above, left, right | above | Posição do ícone em relação ao texto |
| iconScale | number | 0.5-2.0 | 1.0 | Escala do ícone |
| legHeight | number | 30-60mm | 40mm | Altura do pé integrado |
| legWidth | number | 3-8mm | 5mm | Largura do pé |
| baseColor | enum | PLA_COLORS | #14b8a6 | Cor da placa e pé |
| textColor | enum | PLA_COLORS | #f5f5f5 | Cor do texto e ícone |

### Constantes Fixas

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| LEG_DEPTH | 3mm | Profundidade do pé (mesma da placa) |
| LEG_BOTTOM_WIDTH | 8mm | Base do pé (alargada para estabilidade) |
| BORDER_RADIUS | 3mm | Arredondamento dos cantos da placa |

## Arquitetura

### Estrutura de Arquivos

```
src/features/studio/tools/confeitaria/topo-bolo/
├── AGENTS.md              # Documentação da ferramenta (já existe)
├── schema.ts              # Schema Zod + tipos + defaults
├── buildCakeTopper.ts     # Gera geometria 3D (texto + ícone SVG + pé)
├── useCakeTopper.ts       # Hook de estado + debounce + font loading
├── StudioPanel.tsx        # Painel de parâmetros (Amplify UI)
└── CakeTopperPreview.tsx  # Preview R3F
```

### Integração

- **ToolSelector.tsx:** Adicionar `'topo-bolo'` ao tipo `ToolId` e array `TOOLS`
- **StudioPage.tsx:** Lazy-load do painel e preview, criar wrapper `CakeTopperToolWrapper`
- **docs/frontend/studio.md:** Documentar nova ferramenta

### Padrões Seguidos

- Mesma estrutura das ferramentas existentes (suporte-bolo, suporte-foto)
- React.lazy para code-splitting
- Estado local com useReducer + validação Zod
- Debounce de 200ms para rebuild de geometria
- Preview R3F com materiais PLA (meshStandardMaterial)
- Componentes Amplify UI (SliderField, SelectField, TextField, Accordion)

## Lógica de Build

### Algoritmo Principal (`buildCakeTopper`)

**1. Construir a placa (plate)**

- **circle:** `ExtrudeGeometry` de um `Shape` com `absarc` (raio = width/2)
- **rectangle:** `ExtrudeGeometry` de `Shape` retangular com cantos arredondados (`BORDER_RADIUS`)
- **oval:** `ExtrudeGeometry` de `Shape` elíptico (width/2 × height/2)
- Todas com `bevelEnabled: true` (arestas suavizadas)

**2. Construir o texto (text)**

- Carregar fonte via `FontLoader` (reutiliza `fontUrls` de chaveiros)
- Criar `TextGeometry` com `fontSize`, `fontStyle`
- Centralizar texto na placa (bounding box → offset)
- Posicionar em Z = `thickness` (relevo sobre a placa)
- Se houver ícone, ajustar posição do texto conforme `iconPosition`

**3. Construir o ícone SVG (icon)**

- Parse do SVG com `SVGLoader` do Three.js
- Extrair `paths` → converter cada path em `Shape`
- Unir shapes com `mergeGeometries`
- Normalizar bounding box → aplicar `iconScale`
- Posicionar conforme `iconPosition`:
  - `above`: centralizado acima do texto
  - `left`: à esquerda do texto
  - `right`: à direita do texto
- Extrudar com `depth = thickness` (mesma altura do texto em relevo)

**4. Construir o pé (leg)**

- Forma trapezoidal (mais largo na base para estabilidade)
- `LEG_BOTTOM_WIDTH` na base, `legWidth` no topo
- Altura: `legHeight`
- Posicionado centralizado abaixo da placa
- Z vai de `-legHeight` até `0` (base da placa em Z=0)

### Resultado

```typescript
BuildCakeTopperResult {
  plate: BufferGeometry     // Placa com formato (circle/rect/oval)
  text: BufferGeometry      // Texto em relevo sobre a placa
  icon: BufferGeometry | null  // Ícone SVG extrudado (ou null)
  leg: BufferGeometry       // Pé integrado para fixação
}
```

### Diagrama Visual

```
  [ícone]     ← TextGeometry + SVG extrudado
  [texto]     ← relevo sobre a placa
 ┌─────────┐  ← placa (circle/rect/oval)
 │    │    │
 │    │    │  ← pé (trapezoidal)
 └────┘
```

## Hook de Estado

### Estrutura

```typescript
useCakeTopper() {
  params: CakeTopperParams
  geometry: BuildCakeTopperResult | null
  dimensions: { width, height, depth }
  cameraPosition: [number, number, number]
  updateParam: (key, value) => void
  setSvgIcon: (svg: string | null) => void
  reset: () => void
}
```

### Reducer

- **Actions:** `update` (muda parâmetro), `setSvg` (atualiza ícone SVG), `reset` (volta ao default)
- **Validação:** Zod `safeParse` após cada update
- **Clamp:** Valores numéricos dentro dos ranges definidos no schema

### Carregamento de Fonte

- `FontLoader` do three.js
- Cache de fontes (Map<FontStyle, Font>)
- Reutiliza `fontUrls` de `chaveiros/chaveiro/fonts.ts`
- Fontes: helvetiker_regular, helvetiker_bold, optimer_regular (serif)

### Debounce

- `useRef` para timer de 200ms
- Rebuild da geometria apenas após debounce
- `dispose()` de geometrias antigas antes de criar novas

### Camera Position

- Posição calculada para mostrar o topper inteiro na viewport
- Baseada no bounding box da peça (altura total = placa + pé)
- Retorna `[0, 0, distance]` onde distance cobre a peça inteira

### Dimensions

- `width`: largura da placa
- `height`: altura total (placa + pé)
- `depth`: espessura da placa

## Painel de Parâmetros

### Estrutura

```typescript
StudioPanelProps {
  params: CakeTopperParams
  onUpdateParam: (key, value) => void
  onSetSvgIcon: (svg: string | null) => void
  onReset: () => void
}
```

### Organização (Accordion com 5 seções)

**1. Texto**
- `TextField`: conteúdo do texto (max 40 chars)
- `SelectField`: estilo da fonte (normal / bold / serif)
- `SliderField`: tamanho da fonte (8–20mm)

**2. Formato**
- `SelectField`: formato (circle / rectangle / oval)
- `SliderField`: largura (50–120mm)
- `SliderField`: altura (30–80mm)
- `SliderField`: espessura (2–4mm)

**3. Ícone SVG**
- Botão "Upload SVG" (abre file input)
- Preview thumbnail do SVG carregado
- Botão "Remover ícone" (quando houver SVG)
- `SelectField`: posição do ícone (above / left / right)
- `SliderField`: escala do ícone (0.5–2.0)

**4. Suporte (Pé)**
- `SliderField`: altura do pé (30–60mm)
- `SliderField`: largura do pé (3–8mm)

**5. Aparência**
- `ColorSwatches`: cor da placa (PLA_COLORS)
- `ColorSwatches`: cor do texto/ícone (PLA_COLORS)

### Layout

- Largura: `w-64` (256px)
- Borda: `border-l border-neutral-200`
- Fundo: `bg-white`
- Padding: `p-3`
- Botão "Restaurar" no topo

## Preview R3F

### Estrutura

```typescript
CakeTopperPreviewProps {
  geometry: BuildCakeTopperResult | null
  baseColor: string
  textColor: string
}
```

### Renderização

- Se `geometry` for null, retorna null
- Renderiza 4 meshes dentro de um `<group>`:
  1. **plate** com material `baseColor`
  2. **text** com material `textColor`
  3. **icon** com material `textColor` (se existir)
  4. **leg** com material `baseColor`

### Materiais

- Placa e pé: `<meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />`
- Texto e ícone: `<meshStandardMaterial color={textColor} metalness={0.1} roughness={0.3} />`
- Todos com `castShadow` e `receiveShadow`

### Posicionamento na Cena

- O grupo é posicionado pelo StudioViewport (já configurado com OrbitControls, Grid, Environment)
- Não precisa de lógica adicional de posicionamento

## Fora de Escopo

- Export STL (implementado posteriormente)
- Backend/banco de dados
- Autenticação
- Formatos personalizados (contorno desenhado pelo usuário)
- Biblioteca de ícones pré-definidos (apenas upload SVG)
- Vectorização de PNG/JPG

## Próximos Passos

1. Implementar schema.ts com validação Zod
2. Implementar buildCakeTopper.ts com lógica de placa, texto, ícone SVG e pé
3. Implementar useCakeTopper.ts com hook de estado + font loading
4. Implementar StudioPanel.tsx com painel de parâmetros (5 seções)
5. Implementar CakeTopperPreview.tsx com preview R3F (4 meshes)
6. Integrar em ToolSelector.tsx e StudioPage.tsx
7. Atualizar docs/frontend/studio.md
8. Testar funcionalidade completa
