# Suporte para Foto com Texto - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar ferramenta do Studio 3D para gerar suportes de foto personalizados com texto 3D como base e slot centralizado para encaixar fotos.

**Architecture:** Texto 3D dividido em duas partes (esquerda/direita) com slot no meio. Divisão inteligente respeita espaços entre palavras. Base de apoio conecta as partes. Slot inclinado a 75° para encaixe de fotos em tamanhos padrão (10×15, 13×18, 15×20cm).

**Tech Stack:** React 19, TypeScript, Three.js, React Three Fiber, Zod, Amplify UI

**Design Document:** `docs/plans/2026-08-27-suporte-foto-design.md`

---

## Task 1: Schema Zod e Tipos

**Files:**
- Create: `src/features/studio/tools/letreiros/suporte-foto/schema.ts`

**Step 1: Criar schema com validação Zod**

```typescript
import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PHOTO_SIZES = {
  '10x15': { width: 100, height: 150 },
  '13x18': { width: 130, height: 180 },
  '15x20': { width: 150, height: 200 },
} as const

export type PhotoSize = keyof typeof PHOTO_SIZES

export const SLOT_ANGLE = 75
export const SLOT_WIDTH = 2
export const SLOT_DEPTH = 10

export const photoStandParamsSchema = z.object({
  productType: z.literal('photo-stand'),
  text: z.string().trim().min(1).max(30),
  photoSize: z.enum(['10x15', '13x18', '15x20']),
  baseHeight: z.number().min(50).max(120),
  baseThickness: z.number().min(2).max(4),
  baseMinWidth: z.number().min(40).max(100),
  baseDepth: z.number().min(30).max(60),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
})

export type PhotoStandParams = z.infer<typeof photoStandParamsSchema>
export type FontStyle = PhotoStandParams['fontStyle']

export const defaultPhotoStandParams: PhotoStandParams = {
  productType: 'photo-stand',
  text: 'Família',
  photoSize: '10x15',
  baseHeight: 80,
  baseThickness: 3,
  baseMinWidth: 60,
  baseDepth: 40,
  fontStyle: 'bold',
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
}
```

**Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/schema.ts
git commit -m "feat: add photo stand schema with Zod validation"
```

---

## Task 2: Lógica de Build - Divisão de Texto

**Files:**
- Create: `src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.ts`

**Step 1: Implementar função de divisão inteligente**

```typescript
import { type BufferGeometry, BoxGeometry, ExtrudeGeometry, Shape } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import type { PhotoStandParams, FontStyle } from './schema'
import { PHOTO_SIZES, SLOT_WIDTH, SLOT_ANGLE } from './schema'

export interface BuildPhotoStandInput {
  params: PhotoStandParams
  font: Font
}

export interface BuildPhotoStandResult {
  leftText: BufferGeometry
  rightText: BufferGeometry
  base: BufferGeometry
}

function findSplitPoint(text: string, font: Font, fontSize: number): number {
  if (!text.includes(' ')) return Math.floor(text.length / 2)
  
  const tempGeometry = new TextGeometry(text, {
    font,
    size: fontSize,
    depth: 0,
    curveSegments: 8,
    bevelEnabled: false,
  })
  tempGeometry.computeBoundingBox()
  const totalWidth = tempGeometry.boundingBox!.max.x - tempGeometry.boundingBox!.min.x
  tempGeometry.dispose()
  
  const halfWidth = totalWidth / 2
  let bestIndex = 0
  let bestDistance = Infinity
  
  let currentX = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') {
      const charGeometry = new TextGeometry(text.substring(0, i + 1), {
        font,
        size: fontSize,
        depth: 0,
        curveSegments: 8,
        bevelEnabled: false,
      })
      charGeometry.computeBoundingBox()
      currentX = charGeometry.boundingBox!.max.x
      charGeometry.dispose()
      
      const distance = Math.abs(currentX - halfWidth)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i + 1
      }
    }
  }
  
  return bestIndex
}

function splitText(text: string, font: Font, fontSize: number): { left: string; right: string } {
  const splitIndex = findSplitPoint(text, font, fontSize)
  return {
    left: text.substring(0, splitIndex).trim(),
    right: text.substring(splitIndex).trim(),
  }
}
```

**Step 2: Implementar função de criação de texto**

```typescript
function createTextGeometry(text: string, font: Font, size: number, depth: number): BufferGeometry {
  const geometry = new TextGeometry(text, {
    font,
    size,
    depth,
    curveSegments: 8,
    bevelEnabled: false,
  })
  geometry.computeBoundingBox()
  return geometry
}
```

**Step 3: Implementar função principal de build**

```typescript
export function buildPhotoStand({ params, font }: BuildPhotoStandInput): BuildPhotoStandResult {
  const fontSize = params.baseHeight * 0.6
  const { left, right } = splitText(params.text, font, fontSize)
  
  const leftGeometry = createTextGeometry(left, font, fontSize, params.baseThickness)
  const rightGeometry = createTextGeometry(right, font, fontSize, params.baseThickness)
  
  leftGeometry.computeBoundingBox()
  rightGeometry.computeBoundingBox()
  
  const leftWidth = leftGeometry.boundingBox!.max.x - leftGeometry.boundingBox!.min.x
  const rightWidth = rightGeometry.boundingBox!.max.x - rightGeometry.boundingBox!.min.x
  
  const slotWidth = PHOTO_SIZES[params.photoSize].width
  const totalWidth = leftWidth + SLOT_WIDTH + rightWidth
  const actualWidth = Math.max(totalWidth, params.baseMinWidth)
  const padding = (actualWidth - totalWidth) / 2
  
  const leftX = -(SLOT_WIDTH / 2 + leftWidth / 2) - padding
  const rightX = (SLOT_WIDTH / 2 + rightWidth / 2) + padding
  
  leftGeometry.translate(leftX, 0, 0)
  rightGeometry.translate(rightX, 0, 0)
  
  const angleRad = (SLOT_ANGLE * Math.PI) / 180
  leftGeometry.rotateX(angleRad)
  rightGeometry.rotateX(angleRad)
  
  const baseGeometry = new BoxGeometry(actualWidth, params.baseDepth, params.baseThickness)
  baseGeometry.translate(0, -params.baseDepth / 2, -params.baseThickness / 2)
  
  return {
    leftText: leftGeometry,
    rightText: rightGeometry,
    base: baseGeometry,
  }
}
```

**Step 4: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.ts
git commit -m "feat: implement photo stand geometry builder with text splitting"
```

---

## Task 3: Hook de Estado

**Files:**
- Create: `src/features/studio/tools/letreiros/suporte-foto/usePhotoStand.ts`

**Step 1: Implementar hook com useReducer**

```typescript
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from '@/features/studio/tools/chaveiros/chaveiro/fonts'
import { defaultPhotoStandParams, photoStandParamsSchema, type PhotoStandParams, type FontStyle } from './schema'
import { buildPhotoStand, type BuildPhotoStandResult } from './buildPhotoStand'

type PhotoStandAction =
  | { type: 'update'; key: keyof PhotoStandParams; value: number | string }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  baseHeight: { min: 50, max: 120 },
  baseThickness: { min: 2, max: 4 },
  baseMinWidth: { min: 40, max: 100 },
  baseDepth: { min: 30, max: 60 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function photoStandReducer(state: PhotoStandParams, action: PhotoStandAction): PhotoStandParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = photoStandParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultPhotoStandParams
  }
}

export function usePhotoStand() {
  const [params, dispatch] = useReducer(photoStandReducer, defaultPhotoStandParams)
  const [fontCache, setFontCache] = useState<Map<FontStyle, Font>>(new Map())
  const [, setFontError] = useState(false)
  const [geometry, setGeometry] = useState<BuildPhotoStandResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fontStyle = params.fontStyle

  useEffect(() => {
    if (fontCache.has(fontStyle)) return
    const loader = new FontLoader()
    loader.load(
      fontUrls[fontStyle],
      (font) => {
        setFontCache((prev) => new Map(prev).set(fontStyle, font as unknown as Font))
      },
      undefined,
      () => setFontError(true),
    )
  }, [fontStyle, fontCache])

  const font = fontCache.get(fontStyle) ?? null

  useEffect(() => {
    if (!font) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.leftText.dispose()
        prev?.rightText.dispose()
        prev?.base.dispose()
        return buildPhotoStand({ font, params })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [font, params])

  const updateParam = useCallback((key: keyof PhotoStandParams, value: number | string) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => ({
    width: params.baseMinWidth,
    height: params.baseHeight,
    depth: params.baseDepth,
  }), [params.baseMinWidth, params.baseHeight, params.baseDepth])

  return { params, geometry, dimensions, updateParam, reset }
}
```

**Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/usePhotoStand.ts
git commit -m "feat: implement photo stand state hook with font loading"
```

---

## Task 4: Painel de Parâmetros

**Files:**
- Create: `src/features/studio/tools/letreiros/suporte-foto/StudioPanel.tsx`

**Step 1: Implementar componente ColorSwatches**

```typescript
import {
  Accordion,
  Button,
  Flex,
  Heading,
  SelectField,
  SliderField,
  Text,
  TextField,
  View,
} from '@aws-amplify/ui-react'
import { type PhotoStandParams, PLA_COLORS, PHOTO_SIZES } from './schema'

interface StudioPanelProps {
  params: PhotoStandParams
  onUpdateParam: (key: keyof PhotoStandParams, value: number | string) => void
  onReset: () => void
}

function ColorSwatches({
  colors,
  selected,
  onSelect,
}: {
  colors: readonly string[]
  selected: string
  onSelect: (color: string) => void
}) {
  return (
    <Flex direction="row" gap="xs" wrap="wrap">
      {colors.map((color) => (
        <Button
          key={color}
          size="small"
          aria-label={color}
          aria-pressed={color === selected}
          onClick={() => onSelect(color)}
          className="h-7 w-7 rounded-full p-0"
          style={{ backgroundColor: color, border: color === selected ? '2px solid #000' : '2px solid transparent' }}
        />
      ))}
    </Flex>
  )
}
```

**Step 2: Implementar painel principal**

```typescript
export function StudioPanel({
  params,
  onUpdateParam,
  onReset,
}: StudioPanelProps) {
  const slotWidth = PHOTO_SIZES[params.photoSize].width

  return (
    <View
      as="aside"
      aria-label="Painel do estúdio"
      className="flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Suporte para Foto
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="texto">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Texto
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <TextField
                label="Conteúdo"
                value={params.text}
                maxLength={30}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdateParam('text', e.target.value)
                }
              />

              <SelectField
                label="Estilo da letra"
                value={params.fontStyle}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('fontStyle', e.target.value)
                }
              >
                <option value="bold">Negrito</option>
                <option value="normal">Normal</option>
                <option value="serif">Serifada</option>
              </SelectField>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="foto">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Foto
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Tamanho da foto"
                value={params.photoSize}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('photoSize', e.target.value)
                }
              >
                <option value="10x15">10 × 15 cm</option>
                <option value="13x18">13 × 18 cm</option>
                <option value="15x20">15 × 20 cm</option>
              </SelectField>

              <Text fontSize="xs" color="font.tertiary">
                Slot: {slotWidth}mm × 10mm
              </Text>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="base">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Base
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura</Text>
                <Text fontSize="xs" color="font.secondary">{params.baseHeight} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura"
                min={50} max={120} step={5}
                value={params.baseHeight}
                onChange={(value) => onUpdateParam('baseHeight', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Espessura</Text>
                <Text fontSize="xs" color="font.secondary">{params.baseThickness} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Espessura"
                min={2} max={4} step={0.5}
                value={params.baseThickness}
                onChange={(value) => onUpdateParam('baseThickness', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura mínima</Text>
                <Text fontSize="xs" color="font.secondary">{params.baseMinWidth} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura mínima"
                min={40} max={100} step={5}
                value={params.baseMinWidth}
                onChange={(value) => onUpdateParam('baseMinWidth', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Profundidade</Text>
                <Text fontSize="xs" color="font.secondary">{params.baseDepth} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Profundidade"
                min={30} max={60} step={5}
                value={params.baseDepth}
                onChange={(value) => onUpdateParam('baseDepth', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="aparencia">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Aparência
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Text fontSize="xs" color="font.tertiary">
                Cor da base
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.baseColor}
                onSelect={(color) => onUpdateParam('baseColor', color)}
              />

              <Text fontSize="xs" color="font.tertiary">
                Cor do texto
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.letterColor}
                onSelect={(color) => onUpdateParam('letterColor', color)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
```

**Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 4: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/StudioPanel.tsx
git commit -m "feat: implement photo stand parameter panel"
```

---

## Task 5: Preview R3F

**Files:**
- Create: `src/features/studio/tools/letreiros/suporte-foto/PhotoStandPreview.tsx`

**Step 1: Implementar componente de preview**

```typescript
import type { BuildPhotoStandResult } from './buildPhotoStand'

interface PhotoStandPreviewProps {
  geometry: BuildPhotoStandResult | null
  baseColor: string
  letterColor: string
}

export function PhotoStandPreview({ geometry, baseColor, letterColor }: PhotoStandPreviewProps) {
  if (!geometry) return null
  return (
    <group>
      <mesh geometry={geometry.leftText} castShadow receiveShadow>
        <meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />
      </mesh>
      <mesh geometry={geometry.rightText} castShadow receiveShadow>
        <meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />
      </mesh>
      <mesh geometry={geometry.base} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  )
}
```

**Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/PhotoStandPreview.tsx
git commit -m "feat: implement photo stand 3D preview component"
```

---

## Task 6: Integração no Studio

**Files:**
- Modify: `src/features/studio/components/ToolSelector.tsx:3`
- Modify: `src/features/studio/components/ToolSelector.tsx:13-35`
- Modify: `src/features/studio/StudioPage.tsx:1-47`
- Modify: `src/features/studio/StudioPage.tsx:265-299`

**Step 1: Atualizar ToolSelector**

Adicionar `'suporte-foto'` ao tipo `ToolId`:

```typescript
export type ToolId = 'chaveiro' | 'cartao-visita' | 'suporte-bolo' | 'suporte-foto'
```

Adicionar card da ferramenta no array `TOOLS`:

```typescript
{
  id: 'suporte-foto',
  name: 'Suporte para Foto',
  description: 'Suportes personalizados com texto 3D e slot para fotos',
  icon: '🖼️',
  category: 'Letreiros',
},
```

**Step 2: Atualizar StudioPage - Imports**

Adicionar imports no topo:

```typescript
import { usePhotoStand } from './tools/letreiros/suporte-foto/usePhotoStand'
```

Adicionar lazy imports:

```typescript
const SuporteFotoTool = lazy(() =>
  import('./tools/letreiros/suporte-foto/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const SuporteFotoPreview = lazy(() =>
  import('./tools/letreiros/suporte-foto/PhotoStandPreview').then((m) => ({
    default: m.PhotoStandPreview,
  })),
)
```

**Step 3: Atualizar StudioPage - Wrapper**

Adicionar função wrapper antes de `StudioPage`:

```typescript
function SuporteFotoToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const {
    params,
    geometry,
    dimensions,
    updateParam,
    reset,
  } = usePhotoStand()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    // TODO: implement photo stand STL export
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <SuporteFotoTool
            params={params}
            onUpdateParam={updateParam}
            onReset={reset}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
        >
          <Suspense fallback={null}>
            <SuporteFotoPreview
              geometry={geometry}
              baseColor={params.baseColor}
              letterColor={params.letterColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}
```

**Step 4: Atualizar StudioPage - Render**

Adicionar renderização condicional:

```typescript
{activeTool === 'suporte-foto' && (
  <SuporteFotoToolWrapper onBack={() => setActiveTool(null)} />
)}
```

**Step 5: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 6: Commit**

```bash
git add src/features/studio/components/ToolSelector.tsx src/features/studio/StudioPage.tsx
git commit -m "feat: integrate photo stand tool into studio"
```

---

## Task 7: Documentação

**Files:**
- Modify: `docs/frontend/studio.md:5-9`
- Modify: `docs/frontend/studio.md:32-43`

**Step 1: Atualizar lista de ferramentas**

Adicionar na seção "Visão geral":

```markdown
- **Suporte para Foto** — Suportes personalizados com texto 3D e slot para fotos
```

**Step 2: Adicionar seção de edição**

Adicionar após seção do Suporte de Bolo:

```markdown
| **Suporte para Foto** | |
| Schema + tipos | `src/features/studio/tools/letreiros/suporte-foto/schema.ts` |
| Geometria com divisão de texto | `src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.ts` |
| Hook de estado | `src/features/studio/tools/letreiros/suporte-foto/usePhotoStand.ts` |
| Painel de parâmetros | `src/features/studio/tools/letreiros/suporte-foto/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/letreiros/suporte-foto/PhotoStandPreview.tsx` |
```

**Step 3: Adicionar descrição da ferramenta**

Adicionar após descrição do Suporte de Bolo:

```markdown
- **Suporte para Foto:** Texto 3D dividido em duas partes com slot centralizado para encaixar fotos. Divisão inteligente respeita espaços entre palavras. Slot inclinado a 75° para fotos em tamanhos padrão (10×15, 13×18, 15×20cm). Base de apoio conecta as partes.
```

**Step 4: Commit**

```bash
git add docs/frontend/studio.md
git commit -m "docs: add photo stand tool documentation"
```

---

## Task 8: Teste Manual

**Step 1: Iniciar servidor de desenvolvimento**

Run: `npm run dev`

**Step 2: Testar fluxo completo**

1. Acessar `/studio`
2. Verificar se card "Suporte para Foto" aparece no seletor
3. Clicar no card
4. Verificar se painel carrega com valores padrão
5. Verificar se preview 3D aparece
6. Alterar texto e verificar se divide corretamente
7. Alterar tamanho da foto e verificar se slot muda
8. Alterar altura, espessura, largura mínima e profundidade
9. Alterar cores e verificar se atualiza
10. Clicar "Restaurar" e verificar se volta ao padrão

**Step 3: Verificar responsividade**

- Redimensionar janela
- Verificar se painel mantém largura fixa
- Verificar se viewport se adapta

**Step 4: Verificar console**

- Abrir DevTools
- Verificar se não há erros
- Verificar se não há warnings

**Step 5: Commit final (se necessário)**

```bash
git add .
git commit -m "fix: resolve issues found in manual testing"
```

---

## Checklist Final

- [ ] Schema Zod implementado e validando
- [ ] Build gera geometria correta
- [ ] Hook carrega fontes e faz debounce
- [ ] Painel tem todos os controles
- [ ] Preview renderiza 3 meshes
- [ ] ToolSelector mostra nova ferramenta
- [ ] StudioPage integra wrapper
- [ ] Documentação atualizada
- [ ] Teste manual passou
- [ ] Sem erros de compilação
- [ ] Sem erros no console
- [ ] Commits semânticos

---

## Notas de Implementação

**Pontos de atenção:**

1. **Divisão de texto:** O algoritmo de `findSplitPoint` pode precisar de ajustes finos dependendo da fonte. Testar com diferentes textos.

2. **Posicionamento:** O posicionamento dos textos e base pode precisar de ajustes de offset para alinhamento perfeito.

3. **Ângulo:** O ângulo de 75° é aplicado com `rotateX`. Verificar se a orientação está correta no preview.

4. **Performance:** O debounce de 200ms é suficiente para rebuild. Se houver lag, aumentar para 300ms.

5. **Fontes:** Reutiliza `fontUrls` de chaveiros. Se precisar de fontes diferentes, criar mapa próprio.

**Fora de escopo:**

- Export STL (implementar posteriormente)
- Testes automatizados (adicionar em sprint futuro)
- Mobile responsive (painel lateral fixo)
