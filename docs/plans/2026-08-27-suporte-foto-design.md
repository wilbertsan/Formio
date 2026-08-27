# Design: Suporte para Foto com Texto

**Data:** 27 de agosto de 2026  
**Status:** Aprovado  
**Categoria:** Letreiros  
**Ferramenta:** suporte-foto

## Visão Geral

Ferramenta do Studio 3D para gerar suportes/stands de foto personalizados. A base do suporte é formada por texto 3D com um slot centralizado para encaixar fotos em tamanhos padrão (10×15, 13×18, 15×20cm).

## Conceito

O suporte combina funcionalidade de porta-retrato com personalização de letreiro. O texto é dividido inteligentemente em duas partes (esquerda e direita) com um slot no meio para a foto. A divisão respeita os espaços entre palavras para manter a legibilidade.

## Decisões de Design

### Abordagem de Implementação

**Escolhida:** Texto 3D dividido em duas partes

- Gera TextGeometry separado para cada metade do texto
- Slot é o espaço físico entre as duas partes
- Sem CSG (Constructive Solid Geometry), mais simples e eficiente
- Geometria limpa e manifold, pronta para impressão 3D

**Rejeitadas:**
- CSG com subtração: adiciona complexidade e dependência externa
- Slot visual sobreposto: não funcional para impressão

### Parâmetros Configuráveis

| Parâmetro | Tipo | Range | Default | Descrição |
|-----------|------|-------|---------|-----------|
| text | string | 1-30 chars | "Família" | Texto único a ser exibido |
| photoSize | enum | 10x15, 13x18, 15x20 | 10x15 | Tamanho da foto a ser encaixada |
| baseHeight | number | 50-120mm | 80mm | Altura das letras (mm) |
| baseThickness | number | 2-4mm | 3mm | Espessura das letras (mm) |
| baseMinWidth | number | 40-100mm | 60mm | Largura mínima da base (mm) |
| baseDepth | number | 30-60mm | 40mm | Profundidade da base (mm) |
| fontStyle | enum | normal, bold, serif | bold | Estilo da fonte |
| baseColor | enum | PLA_COLORS | #14b8a6 | Cor da base (PLA) |
| letterColor | enum | PLA_COLORS | #f5f5f5 | Cor do texto (PLA) |

### Constantes Fixas

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| slotAngle | 75° | Ângulo de inclinação do slot |
| slotWidth | 2mm | Largura do slot (espessura da foto) |
| slotDepth | 10mm | Profundidade do slot (encaixe da foto) |

## Arquitetura

### Estrutura de Arquivos

```
src/features/studio/tools/letreiros/suporte-foto/
├── AGENTS.md              # Documentação da ferramenta (já existe)
├── schema.ts              # Schema Zod + tipos + defaults
├── buildPhotoStand.ts     # Gera geometria 3D
├── usePhotoStand.ts       # Hook de estado + debounce
├── StudioPanel.tsx        # Painel de parâmetros
└── PhotoStandPreview.tsx  # Preview R3F
```

### Integração

- **ToolSelector.tsx:** Adicionar `'suporte-foto'` ao tipo `ToolId` e array `TOOLS`
- **StudioPage.tsx:** Lazy-load do painel e preview, criar wrapper `SuporteFotoToolWrapper`
- **docs/frontend/studio.md:** Documentar nova ferramenta

### Padrões Seguidos

- Mesma estrutura das ferramentas existentes (chaveiro, cartao-visita, suporte-bolo)
- React.lazy para code-splitting
- Estado local com useReducer + validação Zod
- Debounce de 200ms para rebuild de geometria
- Preview R3F com materiais PLA (meshStandardMaterial)
- Componentes Amplify UI (SliderField, SelectField, TextField, Accordion)

## Lógica de Build

### Algoritmo de Divisão do Texto

1. **Renderizar texto completo**
   - Criar TextGeometry com o texto inteiro
   - Calcular bounding box e largura total

2. **Encontrar ponto de divisão**
   - Calcular posição central (metade da largura)
   - Iterar pelos caracteres para encontrar espaço mais próximo do centro
   - Se não houver espaço, usar centro exato (fallback)

3. **Dividir string**
   - Separar no índice do espaço encontrado
   - Ex: "Família Silva" → "Família" + "Silva"

4. **Gerar geometrias separadas**
   - TextGeometry para texto esquerdo
   - TextGeometry para texto direito
   - Calcular larguras individuais com computeBoundingBox()

5. **Calcular dimensões do slot**
   - Largura do slot baseada no photoSize:
     - 10x15 → 100mm
     - 13x18 → 130mm
     - 15x20 → 150mm
   - Largura total = larguraEsq + slotWidth + larguraDir
   - Se larguraTotal < baseMinWidth, adicionar padding lateral

6. **Posicionar geometrias**
   - Centralizar tudo no eixo X
   - Texto esquerdo: X = -(slotWidth/2 + larguraEsq/2)
   - Texto direito: X = +(slotWidth/2 + larguraDir/2)
   - Slot: espaço entre as duas partes

7. **Aplicar inclinação**
   - Rotacionar ambos os textos em torno do eixo X
   - Ângulo fixo de 75° (slot inclinado para trás)

8. **Criar base de apoio**
   - BoxGeometry ou ExtrudeGeometry retangular
   - Dimensões: larguraTotal × baseDepth × baseThickness
   - Posicionar na parte inferior dos textos

### Resultado

```typescript
BuildPhotoStandResult {
  leftText: BufferGeometry   // Texto à esquerda do slot
  rightText: BufferGeometry  // Texto à direita do slot
  base: BufferGeometry       // Base de apoio conectando as partes
}
```

## Hook de Estado

### Estrutura

```typescript
usePhotoStand() {
  params: PhotoStandParams
  geometry: BuildPhotoStandResult | null
  dimensions: { width, height, depth }
  updateParam: (key, value) => void
  reset: () => void
}
```

### Reducer

- **Actions:** `update` (muda parâmetro) e `reset` (volta ao default)
- **Validação:** Zod safeParse após cada update
- **Clamp:** Valores numéricos dentro dos ranges definidos

### Carregamento de Fonte

- FontLoader do three.js
- Cache de fontes carregadas (Map<FontStyle, Font>)
- Fontes: helvetiker_regular, helvetiker_bold, optimer_regular
- Reutiliza fontUrls de chaveiros/chaveiro/fonts.ts

### Debounce

- useRef para timer de 200ms
- Rebuild da geometria apenas após debounce
- Dispose de geometrias antigas antes de criar novas

### Dimensions

- width: largura total calculada (texto + slot)
- height: baseHeight (altura das letras)
- depth: baseDepth (profundidade da base)

## Painel de Parâmetros

### Estrutura

```typescript
StudioPanelProps {
  params: PhotoStandParams
  onUpdateParam: (key, value) => void
  onReset: () => void
}
```

### Organização (Accordion com 4 seções)

**1. Texto**
- TextField: conteúdo do texto (max 30 chars)
- SelectField: estilo da fonte (normal/bold/serif)

**2. Foto**
- SelectField: tamanho da foto (10x15 / 13x18 / 15x20)
- Text informativo: "Slot: Xmm × 10mm" (largura × profundidade)

**3. Base**
- SliderField: altura das letras (50–120mm)
- SliderField: espessura (2–4mm)
- SliderField: largura mínima (40–100mm)
- SliderField: profundidade (30–60mm)

**4. Aparência**
- ColorSwatches: cor da base (PLA_COLORS)
- ColorSwatches: cor do texto (PLA_COLORS)

### Layout

- Largura: w-64 (256px)
- Borda: border-l border-neutral-200
- Fundo: bg-white
- Padding: p-3
- Cada slider com label + valor atual (ex: "Altura: 80 mm")
- Botão "Restaurar" no topo

## Preview R3F

### Estrutura

```typescript
PhotoStandPreviewProps {
  geometry: BuildPhotoStandResult | null
  baseColor: string
  letterColor: string
}
```

### Renderização

- Se geometry for null, retorna null
- Renderiza 3 meshes dentro de um `<group>`:
  1. **leftText** com material letterColor
  2. **rightText** com material letterColor
  3. **base** com material baseColor

### Materiais

- Textos: `<meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />`
- Base: `<meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />`
- Todos com `castShadow` e `receiveShadow`

### Posicionamento na Cena

- O grupo é posicionado pelo StudioViewport (já configurado com OrbitControls, Grid, Environment)
- Não precisa de lógica adicional de posicionamento

## Fora de Escopo

- Export STL (implementado posteriormente)
- Backend/banco de dados
- Autenticação
- Chaveiros, confeitaria
- Ângulo ajustável (fixo em 75°)
- Largura/profundidade do slot ajustáveis (fixas em 2mm/10mm)

## Próximos Passos

1. Implementar schema.ts com validação Zod
2. Implementar buildPhotoStand.ts com lógica de divisão
3. Implementar usePhotoStand.ts com hook de estado
4. Implementar StudioPanel.tsx com painel de parâmetros
5. Implementar PhotoStandPreview.tsx com preview R3F
6. Integrar em ToolSelector.tsx e StudioPage.tsx
7. Atualizar docs/frontend/studio.md
8. Testar funcionalidade completa
