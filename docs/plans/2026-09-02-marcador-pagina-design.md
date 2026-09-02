# Design: Marcador de Página 3D

**Data:** 2026-09-02  
**Status:** Aprovado  
**Categoria:** Letreiros  
**Abordagem:** Minimalista (código próprio, reuso mínimo)

## Visão Geral

Ferramenta para gerar marcadores de página 3D finos com texto e/ou formas decorativas. O marcador é um item retangular clássico com furo na parte superior para passar fita/laço, permitindo personalização de texto com posicionamento livre.

## Requisitos

### Funcionais
- Formato retangular clássico (cantos retos)
- Dimensões padrão: 120mm x 40mm (comprimento x largura)
- Espessura fixa: 2mm (ideal para não abrir o livro)
- Furo circular simples no topo (sem reforço)
- 1-3 textos independentes com posicionamento livre
- Modos de texto: relevo e gravado
- Cores: base e letras independentes (10 cores PLA)
- Editor visual de posição de textos (modal/overlay)
- Exportação STL binário

### Não Funcionais
- 1 unidade Three.js = 1 mm
- Schema Zod valida todos os parâmetros
- Gerar geometria apenas sob demanda (debounce 200ms)
- Preview 3D leve antes da geração final
- STL sempre manifold, fechado, pronto para impressão

## Arquitetura

### Abordagem Minimalista

Código próprio para marcador de página, reutilizando apenas funções utilitárias essenciais:
- `fonts.ts` (URLs de fontes)
- `textToGeometry.ts` (conversão de texto para geometria)
- Padrão de exportação STL

**Vantagens:**
- Código limpo e específico para o caso de uso
- Fácil manutenção
- Sem acoplamento excessivo com chaveiro

**Desvantagens:**
- Menos reuso de código (aceitável dado o escopo simples)

### Estrutura de Arquivos

```
src/features/studio/tools/letreiros/marcador-pagina/
├── AGENTS.md              (já existe)
├── schema.ts              (Zod schema + defaults)
├── useBookmark.ts         (hook com useReducer + debounce)
├── buildBookmark.ts       (gera geometria Three.js)
├── StudioPanel.tsx        (painel de parâmetros)
├── BookmarkPreview.tsx    (preview 3D no Canvas)
├── TextPositionEditor.tsx (editor visual de posição)
├── exportStl.ts           (exportação STL)
├── fonts.ts               (reutiliza do chaveiro)
└── textToGeometry.ts      (reutiliza do chaveiro)
```

### Integração no Studio

**ToolSelector.tsx:**
- Adicionar `'marcador-pagina'` ao tipo `ToolId`
- Adicionar card na categoria "Letreiros"
- Ícone: 📖 ou similar

**StudioPage.tsx:**
- Importar `useBookmark` hook
- Criar `MarcadorPaginaToolWrapper` com lazy loading
- Renderizar condicionalmente quando `activeTool === 'marcador-pagina'`
- Passar `geometry`, `params`, callbacks para componentes

## Schema e Parâmetros

### bookmarkParamsSchema

```typescript
const bookmarkParamsSchema = z.object({
  productType: z.literal('bookmark'),
  length: z.number().min(50).max(150),      // comprimento (mm)
  width: z.number().min(30).max(50),        // largura (mm)
  thickness: z.literal(2),                  // fixo em 2mm
  holeDiameter: z.number().min(3).max(8),   // furo para fita
  holeMargin: z.number().min(5).max(15),    // margem do topo
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  textMode: z.enum(['raised', 'engraved']),
  texts: z.array(textItemSchema).min(1).max(3),
})
```

### Valores Padrão

```typescript
const defaultBookmarkParams: BookmarkParams = {
  productType: 'bookmark',
  length: 120,
  width: 40,
  thickness: 2,
  holeDiameter: 5,
  holeMargin: 10,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  textMode: 'raised',
  texts: [defaultText],
}
```

### Validações

- `length`: 50-150mm, step 1mm
- `width`: 30-50mm, step 1mm
- `thickness`: fixo em 2mm (literal)
- `holeDiameter`: 3-8mm, step 0.5mm
- `holeMargin`: 5-15mm, step 1mm
- `texts`: 1-3 textos, cada um com:
  - `content`: 1-12 caracteres
  - `width`: 8-60mm
  - `height`: 4-20mm
  - `relief`: 0.4-2mm
  - `offsetX`: -20 a 20mm
  - `offsetY`: -20 a 20mm

## Componentes

### useBookmark.ts

Hook principal com `useReducer` para gerenciar estado:

**Actions:**
- `update`: atualiza parâmetro numérico/string
- `updateText`: atualiza texto específico
- `addText`: adiciona novo texto (max 3)
- `removeText`: remove texto (min 1)
- `updateTextById`: patch de texto por ID
- `reset`: restaura defaults

**Estado:**
- `params`: BookmarkParams
- `fontCache`: Map<FontStyle, Font>
- `fontError`: boolean
- `geometry`: BuildBookmarkResult | null

**Debounce:**
- 200ms antes de rebuild da geometria
- Limpa timeout anterior antes de agendar novo

**Retorno:**
```typescript
{
  params,
  geometry,
  dimensions,
  fontError,
  updateParam,
  updateText,
  addText,
  removeText,
  reset,
}
```

### buildBookmark.ts

Função que gera a geometria Three.js:

**Input:**
```typescript
interface BuildBookmarkInput {
  font?: Font
  fonts?: Partial<Record<FontStyle, Font>>
  params: BookmarkParams
  onError?: (message: string) => void
}
```

**Output:**
```typescript
interface BuildBookmarkResult {
  base: BufferGeometry      // base com furo
  text: BufferGeometry      // textos mergeados
  textItems: Array<{ id: string; geometry: BufferGeometry }>
}
```

**Lógica:**
1. Criar base retangular (Shape + ExtrudeGeometry)
2. Criar furo circular no topo (Path + subtração ou CSG)
3. Para cada texto:
   - Gerar geometria de texto (textToGeometry)
   - Escalar para width/height especificados
   - Posicionar com offsetX/offsetY (respeitando margens)
   - Aplicar depth baseado em relief
4. Se `textMode === 'raised'`:
   - Merge de todas as geometrias de texto
5. Se `textMode === 'engraved'`:
   - Usar three-bvh-csg para subtrair textos da base
   - Fallback para 'raised' se CSG falhar
6. Retornar base + text separados (para cores diferentes no preview)

### StudioPanel.tsx

Painel de parâmetros com Amplify UI:

**Seções (Accordion):**
1. **Texto**
   - Lista de textos (botões para selecionar)
   - Botão "Adicionar texto" (desabilitado se 3)
   - Botão "×" para remover (se > 1)
   - Botão "✥ Posicionar textos" (abre editor)
   - Campo "Conteúdo" (TextField)
   - Select "Estilo da letra" (bold/normal/serif)
   - Switch "Proporcional à peça"
   - Sliders: largura, altura, relevo (se não proporcional)

2. **Base**
   - Select "Modo de texto" (raised/engraved)
   - ColorSwatches: cor da base
   - ColorSwatches: cor das letras
   - Slider: comprimento (50-150mm)
   - Slider: largura (30-50mm)

3. **Furo**
   - Slider: diâmetro (3-8mm)
   - Slider: margem do topo (5-15mm)

**Props:**
```typescript
interface StudioPanelProps {
  params: BookmarkParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onUpdateText: (id: string, patch: Partial<TextItem>) => void
  onAddText: () => void
  onRemoveText: (id: string) => void
  onUpdateParam: (key: keyof BookmarkParams, value: number | string) => void
  onReset: () => void
  onOpenEditor: () => void
}
```

### BookmarkPreview.tsx

Componente de preview 3D:

```typescript
interface BookmarkPreviewProps {
  geometry: BuildBookmarkResult | null
  baseColor: string
  letterColor: string
}
```

**Renderização:**
- `<mesh geometry={geometry.base}>` com material baseColor
- `<mesh geometry={geometry.text}>` com material letterColor
- Ambos com `castShadow` e `receiveShadow`

### TextPositionEditor.tsx

Editor visual de posição (modal/overlay):

**Funcionalidades:**
- Canvas 2D mostrando retângulo do marcador
- Textos renderizados como retângulos arrastáveis
- Seleção de texto por clique
- Drag para reposicionar
- Atualiza offsetX/offsetY do texto selecionado
- Respeita margens de 3mm das bordas

**Props:**
```typescript
interface TextPositionEditorProps {
  params: BookmarkParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onMoveText: (id: string, x: number, y: number) => void
  onClose: () => void
}
```

### exportStl.ts

Exportação STL binário:

```typescript
export function exportStl(
  geometry: BuildBookmarkResult,
  projectName: string
): void
```

**Lógica:**
1. Merge base + text
2. Criar Scene + Mesh
3. Usar STLExporter com `{ binary: true }`
4. Criar Blob + URL
5. Trigger download com nome sanitizado

## Tratamento de Erros

### Validações Zod
- Valores fora do range são clamped (não rejeitados)
- Previne estados inválidos no reducer

### Fallback de Geometria
- Se CSG falhar no modo "engraved", fallback para "raised"
- Log de erro via `onError` callback (sem quebrar UI)

### Validação de Posicionamento
- Textos não podem sair da área útil (margem 3mm das bordas)
- Clamp automático de offsetX/offsetY no build

## Estratégia de Testes

### Testes Unitários (Vitest)

**1. schema.test.ts**
- Validação de ranges (length, width, holeDiameter, etc.)
- Defaults válidos
- Aceita 1-3 textos, rejeita 0 ou 4+
- thickness é literal (2)

**2. useBookmark.test.tsx**
- Inicia com 1 texto no default
- updateParam clampa valores
- addText/removeText funciona corretamente
- updateText patcha o texto correto
- reset restaura defaults
- Gera geometria após carregar fonte

**3. buildBookmark.test.ts**
- Gera base com furo circular
- Textos em modo "raised" são mergeados
- Textos em modo "engraved" usam CSG
- Fallback para "raised" se CSG falhar
- Respeita margens e posicionamento

**4. StudioPanel.test.tsx**
- Renderiza sliders e selects
- Dispara callbacks corretamente
- Mostra/esconde campos condicionais

### Mocks
- FontLoader (fonte fake)
- buildBookmark (geometria fake)
- three-bvh-csg (CSG mock)

## Invariantes

- 1 unidade Three.js = 1 mm
- Schema Zod valida todos os parâmetros
- Gerar geometria apenas sob demanda (debounce 200ms)
- Preview 3D leve antes da geração final
- STL sempre manifold, fechado, pronto para impressão
- Margem mínima de 3mm entre texto e borda
- Espessura fina (2mm) para não abrir o livro
- Furo na parte superior para passar fita/laço

## Fora de Escopo

- Formatos não retangulares (circular, coração, etc.)
- Argola decorativa ou reforço de furo
- Bordas arredondadas
- Múltiplos furos
- Laço decorativo integrado
- Backend/banco de dados
- Landing page

## Decisões de Design

1. **Abordagem Minimalista**: Código próprio ao invés de herdar do chaveiro, mantendo simplicidade e evitando acoplamento.

2. **Furo Circular Simples**: Sem reforço/anel, mantendo o design limpo e funcional.

3. **TextPositionEditor Separado**: Modal/overlay ao invés de integrado no painel, permitindo edição visual mais intuitiva.

4. **Espessura Fixa**: 2mm fixo ao invés de ajustável, garantindo funcionalidade ideal (não abrir o livro).

5. **Modos Relevo e Gravado**: Ambos suportados, com fallback automático para relevo se CSG falhar.

## Próximos Passos

1. Escrever documento de design (este documento)
2. Criar plano de implementação detalhado
3. Implementar schema + testes
4. Implementar hook useBookmark + testes
5. Implementar buildBookmark + testes
6. Implementar StudioPanel + testes
7. Implementar BookmarkPreview
8. Implementar TextPositionEditor
9. Implementar exportStl
10. Integrar no StudioPage
11. Atualizar documentação
