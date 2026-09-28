# Design: Carimbo para Brigadeiro

**Data:** 2026-09-01  
**Status:** Aprovado  
**Ferramenta:** Studio 3D > Confeitaria > Carimbo Brigadeiro

---

## 1. Visão Geral

Gerar carimbos paramétricos para marcar brigadeiros e doces com textos, ícones SVG ou formatos pré-definidos. O carimbo produz relevo negativo (afundado) ou positivo (em relevo) na superfície do doce.

---

## 2. Requisitos Funcionais

### Conteúdo suportado
- Texto (nomes, mensagens curtas — máx. 30 caracteres)
- Ícone/logo personalizado (upload de SVG)
- Combinação de texto + ícone

### Formato da base
- Apenas circular (diâmetro 10–30mm)

### Cabo/grip
- Cilindro simples (fácil de imprimir, ergonomia básica)

### Profundidade do relevo
- Fixa em 1mm

### Parâmetros ajustáveis
- Diâmetro do carimbo: 10–30mm
- Altura total: 15–25mm

### Tipo de relevo
- Negativo (texto afundado — marca em alto-relevo no doce)
- Positivo (texto em relevo — marca em baixo-relevo no doce)
- Usuário escolhe no painel

### Cores
- Cor da base (PLA)
- Cor do relevo (PLA)

---

## 3. Arquitetura

### Estrutura de arquivos
```
src/features/studio/tools/confeitaria/carimbo-brigadeiro/
├── AGENTS.md (já existe)
├── schema.ts
├── buildStamp.ts
├── useStamp.ts
├── StudioPanel.tsx
└── StampPreview.tsx
```

### Padrão arquitetural
Reutilizar estrutura do `topo-bolo`:
- 1 unidade Three.js = 1mm
- React.lazy para code-splitting
- useReducer + Zod para validação
- Debounce de 200ms no build
- Font loading com FontLoader

---

## 4. Schema de Parâmetros

```typescript
stampParamsSchema = z.object({
  productType: z.literal('stamp'),
  text: z.string().min(1).max(30),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(6).max(15),
  diameter: z.number().min(10).max(30),
  height: z.number().min(15).max(25),
  reliefType: z.enum(['negative', 'positive']),
  svgIcon: z.string().nullable(),
  iconScale: z.number().min(0.5).max(2.0),
  baseColor: z.enum(PLA_COLORS),
  reliefColor: z.enum(PLA_COLORS),
})
```

### Constantes fixas
- `RELIEF_DEPTH = 1` (profundidade fixa de 1mm)
- `HANDLE_HEIGHT_RATIO = 0.6` (60% da altura total é o cabo)

### Valores padrão
```typescript
defaultStampParams = {
  productType: 'stamp',
  text: 'Parabéns',
  fontStyle: 'bold',
  fontSize: 10,
  diameter: 20,
  height: 20,
  reliefType: 'negative',
  svgIcon: null,
  iconScale: 1.0,
  baseColor: '#14b8a6',
  reliefColor: '#f5f5f5',
}
```

---

## 5. Função de Build (Geometria)

### Estrutura de retorno
```typescript
interface BuildStampResult {
  base: BufferGeometry      // disco circular (base de contato)
  handle: BufferGeometry    // cilindro superior (grip)
  text: BufferGeometry | null
  icon: BufferGeometry | null
}
```

### Lógica de construção

1. **Base:** `ExtrudeGeometry` de círculo
   - Raio: `diameter / 2`
   - Depth: `height * 0.4` (40% da altura total)
   - Bevel: 0.1mm (arestas arredondadas)

2. **Cabo:** `ExtrudeGeometry` de círculo menor
   - Raio: `diameter * 0.3` (30% do diâmetro da base)
   - Depth: `height * 0.6` (60% da altura total)
   - Posicionado acima da base

3. **Texto/Ícone:** Posicionados na face inferior da base
   - Se `reliefType === 'negative'`: texto afundado (subtração ou depth negativo)
   - Se `reliefType === 'positive'`: texto em relevo (extrusão positiva)
   - Centralizados na face inferior
   - Depth: `RELIEF_DEPTH` (1mm)

### Detalhes técnicos
- Texto: `TextGeometry` com `depth = RELIEF_DEPTH`
- SVG: `SVGLoader` + `ExtrudeGeometry`
- Bevel suave (0.1mm) para arestas arredondadas
- Centralização automática de texto/ícone

---

## 6. Hook de Estado (`useStamp.ts`)

### Estrutura
```typescript
export function useStamp() {
  const [params, dispatch] = useReducer(stampReducer, defaultStampParams)
  const [geometry, setGeometry] = useState<BuildStampResult | null>(null)
  const [font, setFont] = useState<Font | null>(null)
  
  // Load font baseado no fontStyle
  // Debounce de 200ms no build
  // Cleanup de geometrias antigas
  
  return {
    params,
    geometry,
    dimensions: { diameter: params.diameter, height: params.height },
    cameraPosition: [0, 0, params.diameter * 2],
    updateParam,
    setSvgIcon,
    reset,
  }
}
```

### Validação
- Clamping de valores numéricos (diameter, height, fontSize, iconScale)
- Zod safeParse antes de atualizar estado
- NUMERIC_RANGES para limites

---

## 7. Painel de Controle (`StudioPanel.tsx`)

### Seções do accordion

1. **Texto**
   - TextField: conteúdo (máx. 30 chars)
   - SelectField: estilo da fonte (normal, bold, serif)
   - SliderField: tamanho da fonte (6–15mm)

2. **Formato**
   - SliderField: diâmetro (10–30mm)
   - SliderField: altura (15–25mm)

3. **Ícone SVG**
   - Button: upload de SVG
   - SliderField: escala do ícone (0.5x–2.0x)

4. **Relevo**
   - SelectField: tipo (negativo, positivo)

5. **Aparência**
   - ColorSwatches: cor da base
   - ColorSwatches: cor do relevo

### Componentes reutilizados
- Accordion, Button, Flex, Heading, SelectField, SliderField, Text, TextField, View (Amplify UI)
- ColorSwatches (componente local)

---

## 8. Preview R3F (`StampPreview.tsx`)

### Estrutura
```typescript
<group>
  <mesh geometry={base} castShadow receiveShadow>
    <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
  </mesh>
  <mesh geometry={handle} castShadow receiveShadow>
    <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
  </mesh>
  {text && (
    <mesh geometry={text} castShadow receiveShadow>
      <meshStandardMaterial color={reliefColor} metalness={0.1} roughness={0.3} />
    </mesh>
  )}
  {icon && (
    <mesh geometry={icon} castShadow receiveShadow>
      <meshStandardMaterial color={reliefColor} metalness={0.1} roughness={0.3} />
    </mesh>
  )}
</group>
```

### Materiais
- `meshStandardMaterial` com `metalness: 0.1`, `roughness: 0.4` (base/cabo)
- `meshStandardMaterial` com `metalness: 0.1`, `roughness: 0.3` (relevo)

---

## 9. Integração no StudioPage

### Passos
1. Adicionar `carimbo-brigadeiro` ao `toolSelector` em `StudioPage.tsx`
2. Importar `StudioPanel` e `StampPreview` com `React.lazy`
3. Passar props para `StudioPanel`:
   - `params`
   - `onUpdateParam`
   - `onSetSvgIcon`
   - `onReset`
4. Renderizar `StampPreview` no viewport com:
   - `geometry`
   - `baseColor`
   - `reliefColor`

---

## 10. Testes

### Estrutura
```
tests/features/studio/tools/confeitaria/carimbo-brigadeiro/
├── schema.test.ts
├── buildStamp.test.ts
└── useStamp.test.ts
```

### Casos de teste
- **Schema:** validação de parâmetros, limites, tipos
- **Build:** geração de geometria, relevo negativo/positivo, texto/ícone
- **Hook:** estado inicial, atualização de parâmetros, debounce, cleanup

---

## 11. Regras do Domínio

- Relevo negativo (o que é gravado aparece em alto-relevo no doce)
- Superfície plana de contato (base)
- Altura mínima para grip durante uso (60% da altura total)
- Arestas arredondadas (bevel 0.1mm)
- STL sempre manifold, fechado, sem auto-interseções

---

## 12. Fora de Escopo

- Chaveiros, letreiros, backend
- Formatos de base não-circulares
- Cabo anatômico ou disco plano
- Profundidade de relevo ajustável

---

## 13. Decisões de Design

| Decisão | Justificativa |
|---------|---------------|
| Reutilizar estrutura do topo-bolo | Consistência, manutenção simplificada |
| Base apenas circular | Mais comum para brigadeiros redondos |
| Cabo cilíndrico simples | Fácil de imprimir, ergonomia básica |
| Profundidade fixa de 1mm | Funciona bem para brigadeiros, simplifica UI |
| Relevo negativo/positivo | Flexibilidade para diferentes efeitos visuais |
| Upload de SVG | Personalização com logos/ícones |

---

## 14. Próximos Passos

1. Invocar skill `writing-plans` para criar plano de implementação detalhado
2. Implementar schema, build, hook, painel, preview
3. Integrar no StudioPage
4. Criar testes
5. Atualizar documentação
