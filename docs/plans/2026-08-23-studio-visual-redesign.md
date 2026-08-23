# Reformulação Visual do Studio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir a UX do Studio — tema claro consistente com a landing, formas/modo-texto na toolbar esquerda, parâmetros condensados (mantendo Amplify UI), grid distante que não cruza a figura e gravação rasa que elimina o texto espelhado.

**Architecture:** Ajustes incrementais nos componentes existentes. `StudioToolbar` vira seletor de formas/modo (estado vem do `useKeychain`, sem duplicação); `StudioParameters` perde forma/modo e condensa sliders via CSS; `buildKeychain` grava apenas `textDepth` na face frontal; `StudioViewport` com grid em y=-25 e câmera frontal.

**Tech Stack:** Amplify UI 6 (SliderField/TextField/Button mantidos), Tailwind 4, three/drei, Vitest.

**Design doc:** `docs/plans/2026-08-23-studio-visual-redesign-design.md`

---

## Convenções para o executor

- **TDD obrigatório:** @superpowers:test-driven-development — teste → falha → implementação → pass → commit. Tasks 5 e 6 são visuais/docs (verificação por teste existente + build).
- **Commits semânticos** após cada task. Toda task termina com o build/teste verde (não quebre o StudioPage em commits intermediários — Toolbar e StudioPage são atualizados juntos na Task 2).
- **Comandos:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- **Contexto:** repo `/opt/projects/BELIS3D`, branch `main`, 86 testes passando. Arquivos: `src/features/studio/{StudioPage.tsx, components/*.tsx, keychain/buildKeychain.ts, hooks/useKeychain.ts}` + testes em `tests/features/studio/` espelhando.
- **Tema claro:** painéis `bg-white`, bordas `border-neutral-200`, texto `neutral-700/900`, ativos `teal-600`. Os componentes Amplify UI já renderizam claro (o escuro vinha das classes Tailwind).
- **Manual check final:** girar o modelo no navegador — texto gravado não pode aparecer espelhado por trás; grid nunca cruza a figura; painel de parâmetros sem scroll em 1080p.

---

### Task 1: Gravação rasa — fix do texto espelhado (TDD)

**Files:**
- Modify: `src/features/studio/keychain/buildKeychain.ts`
- Test: `tests/features/studio/keychain/buildKeychain.test.ts`

**Step 1: Atualizar o teste** — substituir TODO o conteúdo de `tests/features/studio/keychain/buildKeychain.test.ts`:

```ts
import * as THREE from 'three'
import { buildKeychain, type BuildKeychainInput } from '@/features/studio/keychain/buildKeychain'
import { defaultKeychainParams, type KeychainParams } from '@/features/studio/keychain/schema'

const { csgCalls } = vi.hoisted(() => {
  const csgCalls: Array<{ base: THREE.BufferGeometry; text: THREE.BufferGeometry }> = []
  return { csgCalls }
})

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor(_text?: string, parameters?: { size: number; depth: number }) {
      super()
      if (!parameters) return
      const w = parameters.size * 4
      const h = parameters.size
      const d = parameters.depth
      this.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [
            -w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0,
            -w / 2, -h / 2, d, w / 2, -h / 2, d, w / 2, h / 2, d, -w / 2, h / 2, d,
          ],
          3,
        ),
      )
      this.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 7, 4, 0, 3, 7, 1, 5, 6, 1, 6, 2])
    }
  },
}))

vi.mock('three-bvh-csg', () => ({
  Brush: class {
    constructor(public geometry: THREE.BufferGeometry) {}
  },
  Evaluator: class {
    evaluate(a: { geometry: THREE.BufferGeometry }, b: { geometry: THREE.BufferGeometry }): THREE.BufferGeometry {
      csgCalls.push({ base: a.geometry, text: b.geometry })
      return a.geometry.clone()
    }
  },
  SUBTRACTION: 2,
}))

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: (geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    const merged = new THREE.BufferGeometry()
    Object.assign(merged, geos[0].clone())
    return merged
  },
}))

const fontStub = { glyphs: {} } as never

function makeInput(overrides?: Partial<BuildKeychainInput>): BuildKeychainInput {
  return {
    font: fontStub,
    params: { ...defaultKeychainParams, ...overrides?.params },
    onError: () => undefined,
  }
}

describe('buildKeychain', () => {
  it('modo raised retorna geometria com atributos de posição', () => {
    const geometry = buildKeychain(makeInput())
    expect(geometry.getAttribute('position')).toBeDefined()
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
  })

  it('modo engraved usa CSG e retorna geometria', () => {
    csgCalls.length = 0
    const geometry = buildKeychain(makeInput({ params: { textMode: 'engraved' } as KeychainParams }))
    expect(geometry.getAttribute('position')).toBeDefined()
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
    expect(csgCalls).toHaveLength(1)
  })

  it('desloca texto para z >= thickness em raised', () => {
    const geometry = buildKeychain(makeInput())
    geometry.computeBoundingBox()
    expect(geometry.boundingBox?.max.z).toBeGreaterThan(defaultKeychainParams.thickness)
  })

  it('gravado não atravessa a base — verso fica intacto', () => {
    csgCalls.length = 0
    const geometry = buildKeychain(makeInput({ params: { textMode: 'engraved' } as KeychainParams }))
    geometry.computeBoundingBox()
    expect(geometry.boundingBox?.min.z).toBeGreaterThan(-0.3)
    expect(geometry.boundingBox?.max.z).toBeLessThanOrEqual(defaultKeychainParams.thickness + 0.3)
  })

  it('texto do CSG entra apenas pela face frontal', () => {
    csgCalls.length = 0
    buildKeychain(makeInput({ params: { textMode: 'engraved' } as KeychainParams }))
    expect(csgCalls).toHaveLength(1)
    const textGeometry = csgCalls[0]?.text
    expect(textGeometry).toBeDefined()
    textGeometry.computeBoundingBox()
    // começa acima de z=0 (não sai por trás)
    expect(textGeometry.boundingBox?.min.z).toBeGreaterThan(-0.01)
    // ultrapassa a face frontal (thickness) para o CSG cortar limpo
    expect(textGeometry.boundingBox?.max.z).toBeGreaterThan(defaultKeychainParams.thickness)
    // profundidade do corte = textDepth + epsilon (não atravessa)
    const depth = (textGeometry.boundingBox?.max.z ?? 0) - (textGeometry.boundingBox?.min.z ?? 0)
    expect(depth).toBeLessThanOrEqual(defaultKeychainParams.textDepth + 0.3)
  })
})
```

**Step 2: Rodar → FAIL** (o teste novo falha: o texto atual atravessa com `thickness + 1`)

Run: `npx vitest run tests/features/studio/keychain/buildKeychain.test.ts`

**Step 3: Implementar a gravação rasa em `buildKeychain.ts`** — substituir TODO o conteúdo:

```ts
import { type BufferGeometry, ExtrudeGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Evaluator, SUBTRACTION, Brush } from 'three-bvh-csg'
import { createBaseShape } from './shapes'
import { fitTextHeight, nameToGeometry } from './textToGeometry'
import type { KeychainParams } from './schema'

export interface BuildKeychainInput {
  font: Font
  params: KeychainParams
  onError?: (message: string) => void
}

const TEXT_WIDTH_FACTOR = 0.62
const ENGRAVE_EPSILON = 0.2

export function buildKeychain({ font, params, onError }: BuildKeychainInput): BufferGeometry {
  const baseShape = createBaseShape(params.shape, params.width, params.height, params.holeDiameter)
  const baseGeometry = new ExtrudeGeometry(baseShape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 1,
  })

  const availableWidth = params.width - 8
  const textSize = fitTextHeight({
    name: params.name,
    requestedSize: params.textHeight,
    maxWidth: availableWidth,
    factor: TEXT_WIDTH_FACTOR,
  })

  if (params.textMode === 'raised') {
    const textGeometry = nameToGeometry({
      font,
      name: params.name,
      size: textSize,
      depth: params.textDepth,
    })
    textGeometry.translate(0, 0, params.thickness - 0.01)
    const merged = mergeGeometries([baseGeometry, textGeometry])
    if (!merged) {
      onError?.('Falha ao montar o modelo')
      return baseGeometry
    }
    merged.computeVertexNormals()
    return merged
  }

  try {
    const textGeometry = nameToGeometry({
      font,
      name: params.name,
      size: textSize,
      depth: params.textDepth + ENGRAVE_EPSILON,
    })
    textGeometry.translate(0, 0, params.thickness - params.textDepth - ENGRAVE_EPSILON / 2)
    const evaluator = new Evaluator()
    const result = evaluator.evaluate(new Brush(baseGeometry), new Brush(textGeometry), SUBTRACTION)
    result.geometry.computeVertexNormals()
    return result.geometry
  } catch {
    onError?.('Falha na gravação; usando relevo')
    const fallback = nameToGeometry({
      font,
      name: params.name,
      size: textSize,
      depth: params.textDepth,
    })
    fallback.translate(0, 0, params.thickness - 0.01)
    const merged = mergeGeometries([baseGeometry, fallback])
    if (!merged) return baseGeometry
    merged.computeVertexNormals()
    return merged
  }
}
```

Mudança-chave: `CSG_TEXT_OVERFLOW` morre; o texto gravado ocupa `z ∈ [thickness − textDepth − ε/2, thickness + ε/2]` — corta apenas `textDepth` a partir da face frontal, verso sólido.

**Step 4: Rodar → PASS**

Run: `npx vitest run tests/features/studio/keychain/buildKeychain.test.ts`

**Step 5: Commit**

```bash
git add src/features/studio/keychain/buildKeychain.ts tests/features/studio/keychain/buildKeychain.test.ts
git commit -m "fix: grava texto apenas na face frontal do chaveiro"
```

---

### Task 2: Toolbar de formas/modo + StudioPage (TDD)

**Files:**
- Modify: `src/features/studio/components/StudioToolbar.tsx` (reescrito)
- Modify: `src/features/studio/StudioPage.tsx`
- Test: `tests/features/studio/components/StudioToolbar.test.tsx` (reescrito)
- Test: `tests/features/studio/StudioPage.test.tsx` (atualizado)

**Step 1: Reescrever o teste da Toolbar** — substituir TODO o conteúdo de `tests/features/studio/components/StudioToolbar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioToolbar } from '@/features/studio/components/StudioToolbar'
import type { KeychainParams } from '@/features/studio/keychain/schema'

interface ToolbarOverrides {
  activeShape?: KeychainParams['shape']
  textMode?: KeychainParams['textMode']
}

function renderToolbar(overrides?: ToolbarOverrides) {
  return render(
    <StudioToolbar
      activeShape={overrides?.activeShape ?? 'rect'}
      textMode={overrides?.textMode ?? 'raised'}
      onSelectShape={() => undefined}
      onSelectTextMode={() => undefined}
      onResetCamera={() => undefined}
    />,
  )
}

describe('StudioToolbar', () => {
  it('renderiza formas, modos de texto e reset de câmera', () => {
    renderToolbar()
    expect(screen.getByRole('button', { name: 'Retângulo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Círculo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coração' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Relevo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gravado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resetar câmera' })).toBeInTheDocument()
  })

  it('não renderiza botões de câmera decorativos antigos', () => {
    renderToolbar()
    expect(screen.queryByRole('button', { name: 'Selecionar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mover' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rotacionar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Zoom' })).not.toBeInTheDocument()
  })

  it('marca a forma ativa com aria-pressed', () => {
    renderToolbar({ activeShape: 'heart' })
    expect(screen.getByRole('button', { name: 'Coração' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Retângulo' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('marca o modo de texto ativo com aria-pressed', () => {
    renderToolbar({ textMode: 'engraved' })
    expect(screen.getByRole('button', { name: 'Gravado' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Relevo' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('dispara onSelectShape ao clicar em uma forma', async () => {
    const user = userEvent.setup()
    const onSelectShape = vi.fn()
    render(
      <StudioToolbar
        activeShape="rect"
        textMode="raised"
        onSelectShape={onSelectShape}
        onSelectTextMode={() => undefined}
        onResetCamera={() => undefined}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Círculo' }))
    expect(onSelectShape).toHaveBeenCalledWith('circle')
  })

  it('dispara onSelectTextMode ao clicar em um modo', async () => {
    const user = userEvent.setup()
    const onSelectTextMode = vi.fn()
    render(
      <StudioToolbar
        activeShape="rect"
        textMode="raised"
        onSelectShape={() => undefined}
        onSelectTextMode={onSelectTextMode}
        onResetCamera={() => undefined}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Gravado' }))
    expect(onSelectTextMode).toHaveBeenCalledWith('engraved')
  })

  it('dispara onResetCamera ao clicar em resetar', async () => {
    const user = userEvent.setup()
    const onResetCamera = vi.fn()
    render(
      <StudioToolbar
        activeShape="rect"
        textMode="raised"
        onSelectShape={() => undefined}
        onSelectTextMode={() => undefined}
        onResetCamera={onResetCamera}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Resetar câmera' }))
    expect(onResetCamera).toHaveBeenCalledTimes(1)
  })
})
```

**Step 2: Atualizar o teste da StudioPage** — no arquivo `tests/features/studio/StudioPage.test.tsx`, substituir o teste `renderiza os controles de ferramentas` por:

```tsx
  it('renderiza as ferramentas de formas e modos na coluna esquerda', () => {
    renderStudioPage()
    expect(screen.getByRole('navigation', { name: /ferramentas do studio/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retângulo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Círculo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coração' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Relevo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gravado' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /selecionar/i })).not.toBeInTheDocument()
  })

  it('seleciona forma pela toolbar e reflete aria-pressed', async () => {
    const user = userEvent.setup()
    renderStudioPage()
    await user.click(screen.getByRole('button', { name: 'Círculo' }))
    expect(screen.getByRole('button', { name: 'Círculo' })).toHaveAttribute('aria-pressed', 'true')
  })
```

**Step 3: Rodar → FAIL**

Run: `npx vitest run tests/features/studio/components/StudioToolbar.test.tsx tests/features/studio/StudioPage.test.tsx`

**Step 4: Reescrever `StudioToolbar.tsx`** — substituir TODO o conteúdo:

```tsx
import { View } from '@aws-amplify/ui-react'
import type { KeychainParams } from '../keychain/schema'

interface StudioToolbarProps {
  activeShape: KeychainParams['shape']
  textMode: KeychainParams['textMode']
  onSelectShape: (shape: KeychainParams['shape']) => void
  onSelectTextMode: (mode: KeychainParams['textMode']) => void
  onResetCamera: () => void
}

const shapes: { id: KeychainParams['shape']; label: string; icon: string }[] = [
  { id: 'rect', label: 'Retângulo', icon: '▭' },
  { id: 'circle', label: 'Círculo', icon: '◯' },
  { id: 'heart', label: 'Coração', icon: '♥' },
]

const textModes: { id: KeychainParams['textMode']; label: string; icon: string }[] = [
  { id: 'raised', label: 'Relevo', icon: 'A▲' },
  { id: 'engraved', label: 'Gravado', icon: 'A▼' },
]

const inactiveButtonClassName =
  'flex h-10 w-10 items-center justify-center rounded-md text-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900'
const activeButtonClassName =
  'flex h-10 w-10 items-center justify-center rounded-md text-lg bg-teal-600 text-white transition-colors'

export function StudioToolbar({
  activeShape,
  textMode,
  onSelectShape,
  onSelectTextMode,
  onResetCamera,
}: StudioToolbarProps) {
  return (
    <View
      as="nav"
      aria-label="Ferramentas do studio"
      className="flex w-14 flex-col items-center gap-1 border-r border-neutral-200 bg-white py-2"
    >
      {shapes.map((shape) => (
        <button
          key={shape.id}
          type="button"
          title={shape.label}
          aria-label={shape.label}
          aria-pressed={activeShape === shape.id}
          onClick={() => onSelectShape(shape.id)}
          className={activeShape === shape.id ? activeButtonClassName : inactiveButtonClassName}
        >
          <span aria-hidden="true">{shape.icon}</span>
        </button>
      ))}
      <View className="my-1 h-px w-8 bg-neutral-200" />
      {textModes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          title={mode.label}
          aria-label={mode.label}
          aria-pressed={textMode === mode.id}
          onClick={() => onSelectTextMode(mode.id)}
          className={`text-sm ${textMode === mode.id ? activeButtonClassName : inactiveButtonClassName}`}
        >
          <span aria-hidden="true">{mode.icon}</span>
        </button>
      ))}
      <View className="my-1 h-px w-8 bg-neutral-200" />
      <button
        type="button"
        title="Resetar câmera"
        aria-label="Resetar câmera"
        onClick={onResetCamera}
        className={inactiveButtonClassName}
      >
        <span aria-hidden="true">⌂</span>
      </button>
    </View>
  )
}
```

**Step 5: Atualizar `StudioPage.tsx`** — remover estado `activeTool` e import de `StudioTool`; forma/modo via `useKeychain`:

```tsx
import { useCallback, useState } from 'react'
import { StudioTopbar } from './components/StudioTopbar'
import { StudioToolbar } from './components/StudioToolbar'
import { StudioViewport } from './components/StudioViewport'
import { StudioParameters } from './components/StudioParameters'
import { StudioStatusBar } from './components/StudioStatusBar'
import { useKeychain } from './hooks/useKeychain'
import { exportStl } from './keychain/exportStl'
import type { KeychainParams } from './keychain/schema'

export function StudioPage() {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const { params, geometry, dimensions, updateParam, updateName, reset } = useKeychain()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    if (geometry) {
      exportStl(geometry, projectName)
    }
  }, [geometry, projectName])

  const handleSelectShape = useCallback(
    (shape: KeychainParams['shape']) => updateParam('shape', shape),
    [updateParam],
  )

  const handleSelectTextMode = useCallback(
    (mode: KeychainParams['textMode']) => updateParam('textMode', mode),
    [updateParam],
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
      />
      <div className="flex min-h-0 flex-1">
        <StudioToolbar
          activeShape={params.shape}
          textMode={params.textMode}
          onSelectShape={handleSelectShape}
          onSelectTextMode={handleSelectTextMode}
          onResetCamera={handleResetCamera}
        />
        <StudioViewport geometry={geometry} resetCameraSignal={resetCameraSignal} />
        <StudioParameters
          params={params}
          onUpdateParam={updateParam}
          onUpdateName={updateName}
          onReset={reset}
        />
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}
```

**Step 6: Rodar todos os testes do Studio → PASS**

Run: `npx vitest run tests/features/studio/`

**Step 7: Commit**

```bash
git add src/features/studio/components/StudioToolbar.tsx src/features/studio/StudioPage.tsx tests/features/studio/components/StudioToolbar.test.tsx tests/features/studio/StudioPage.test.tsx
git commit -m "feat: toolbar com formas e modos de texto no painel esquerdo"
```

---

### Task 3: Painel de parâmetros condensado (TDD)

**Files:**
- Modify: `src/features/studio/components/StudioParameters.tsx` (reescrito)
- Modify: `src/index.css` (regra de compactação)
- Test: `tests/features/studio/components/StudioParameters.test.tsx` (reescrito)

**Step 1: Reescrever o teste** — substituir TODO o conteúdo de `tests/features/studio/components/StudioParameters.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioParameters } from '@/features/studio/components/StudioParameters'
import { defaultKeychainParams } from '@/features/studio/keychain/schema'

function renderParameters(
  onUpdate = () => undefined,
  onName = () => undefined,
  onReset = () => undefined,
) {
  return render(
    <StudioParameters
      params={defaultKeychainParams}
      onUpdateParam={onUpdate}
      onUpdateName={onName}
      onReset={onReset}
    />,
  )
}

describe('StudioParameters', () => {
  it('renderiza título e campo de nome', () => {
    renderParameters()
    expect(screen.getByRole('heading', { name: 'Parâmetros' })).toBeInTheDocument()
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
  })

  it('não renderiza controles de forma e modo (movidos para a toolbar)', () => {
    renderParameters()
    expect(screen.queryByRole('button', { name: /retângulo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /círculo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /coração/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/relevo/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/gravado/i)).not.toBeInTheDocument()
  })

  it('renderiza os seis sliders com valor em mm', () => {
    renderParameters()
    expect(screen.getByLabelText('Largura')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura')).toBeInTheDocument()
    expect(screen.getByLabelText('Espessura')).toBeInTheDocument()
    expect(screen.getByLabelText('Tamanho do texto')).toBeInTheDocument()
    expect(screen.getByLabelText('Profundidade do texto')).toBeInTheDocument()
    expect(screen.getByLabelText('Diâmetro do furo')).toBeInTheDocument()
    expect(screen.getByText('50 mm')).toBeInTheDocument()
    expect(screen.getByText('3 mm')).toBeInTheDocument()
  })

  it('dispara onUpdateName ao digitar', async () => {
    const user = userEvent.setup()
    const onName = vi.fn()
    renderParameters(undefined, onName)
    await user.type(screen.getByLabelText(/nome/i), 'a')
    expect(onName).toHaveBeenCalled()
  })

  it('dispara onUpdateParam ao alterar um slider', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    renderParameters(onUpdate)
    const widthSlider = screen.getByLabelText('Largura')
    await user.click(widthSlider)
    await user.keyboard('{ArrowRight}')
    expect(onUpdate).toHaveBeenCalledWith('width', 51)
  })

  it('restaura padrão', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    renderParameters(undefined, undefined, onReset)
    await user.click(screen.getByRole('button', { name: /restaurar/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
```

Nota: se a interação do slider divergir no jsdom (o SliderField do Amplify UI despacha valor direto), adapte a assertion para o padrão que já funciona no teste atual (leia `git show HEAD:tests/features/studio/components/StudioParameters.test.tsx` para referência).

**Step 2: Rodar → FAIL**

**Step 3: Reescrever `StudioParameters.tsx`** — substituir TODO o conteúdo:

```tsx
import {
  Button,
  Flex,
  Heading,
  SliderField,
  Text,
  TextField,
  View,
} from '@aws-amplify/ui-react'
import { type KeychainParams } from '../keychain/schema'

interface StudioParametersProps {
  params: KeychainParams
  onUpdateParam: (key: keyof KeychainParams, value: number | string) => void
  onUpdateName: (name: string) => void
  onReset: () => void
}

const SLIDERS = [
  { key: 'width' as const, label: 'Largura', min: 20, max: 80, step: 1, unit: 'mm' },
  { key: 'height' as const, label: 'Altura', min: 20, max: 80, step: 1, unit: 'mm' },
  { key: 'thickness' as const, label: 'Espessura', min: 2, max: 6, step: 0.5, unit: 'mm' },
  { key: 'textHeight' as const, label: 'Tamanho do texto', min: 10, max: 24, step: 1, unit: 'mm' },
  { key: 'textDepth' as const, label: 'Profundidade do texto', min: 0.4, max: 2, step: 0.1, unit: 'mm' },
  { key: 'holeDiameter' as const, label: 'Diâmetro do furo', min: 3, max: 8, step: 0.5, unit: 'mm' },
]

export function StudioParameters({
  params,
  onUpdateParam,
  onUpdateName,
  onReset,
}: StudioParametersProps) {
  return (
    <View
      as="aside"
      aria-label="Parâmetros do modelo"
      className="studio-parameters flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Parâmetros
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <TextField
        label="Nome"
        descriptiveText="Até 12 caracteres. Acentos são removidos."
        value={params.name}
        maxLength={12}
        onChange={(e) => onUpdateName(e.target.value)}
      />

      {SLIDERS.map((slider) => (
        <View key={slider.key} className="flex flex-col gap-0.5">
          <Flex direction="row" justifyContent="space-between">
            <Text fontSize="xs" color="font.tertiary">
              {slider.label}
            </Text>
            <Text fontSize="xs" color="font.secondary">
              {params[slider.key]} {slider.unit}
            </Text>
          </Flex>
          <SliderField
            label=""
            aria-label={slider.label}
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={params[slider.key]}
            onChange={(value) => onUpdateParam(slider.key, value as number)}
          />
        </View>
      ))}
    </View>
  )
}
```

**Step 4: Adicionar regra de compactação ao final de `src/index.css`**:

```css
.studio-parameters .amplify-field {
  margin-block: 0;
}
```

Nota: se a margem persistir, inspecione as classes reais no DOM (`.amplify-field`, `.amplify-sliderfield`, `.amplify-textfield`) e amplie a regra para elas — o objetivo é margem vertical zero dentro do painel.

**Step 5: Rodar → PASS**

Run: `npx vitest run tests/features/studio/components/StudioParameters.test.tsx tests/features/studio/StudioPage.test.tsx`

**Step 6: Commit**

```bash
git add src/features/studio/components/StudioParameters.tsx src/index.css tests/features/studio/components/StudioParameters.test.tsx
git commit -m "feat: painel de parâmetros condensado com tema claro"
```

---

### Task 4: Viewport claro + grid distante (TDD)

**Files:**
- Modify: `src/features/studio/components/StudioViewport.tsx`
- Modify: `src/features/studio/components/KeychainPreview.tsx` (remove ContactShadows)
- Test: `tests/features/studio/components/StudioViewport.test.tsx` (atualizado)

**Step 1: Atualizar o teste do viewport** — substituir TODO o conteúdo de `tests/features/studio/components/StudioViewport.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { StudioViewport } from '@/features/studio/components/StudioViewport'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="canvas-mock">{children}</div>
  ),
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: ({ position }: { position?: [number, number, number] }) => (
    <div data-testid="grid" data-position={position?.join(',')} />
  ),
  Environment: () => <div data-testid="environment" />,
}))

vi.mock('@/features/studio/components/KeychainPreview', () => ({
  KeychainPreview: ({ geometry }: { geometry: unknown }) =>
    geometry ? <div data-testid="keychain-preview" /> : <div data-testid="keychain-loading" />,
}))

describe('StudioViewport', () => {
  it('renderiza o canvas com descrição acessível', () => {
    render(<StudioViewport geometry={null} resetCameraSignal={0} />)
    expect(screen.getByTestId('canvas-mock')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /visualização 3d do modelo/i })).toBeInTheDocument()
  })

  it('mostra loading quando geometria não está pronta', () => {
    render(<StudioViewport geometry={null} resetCameraSignal={0} />)
    expect(screen.getByTestId('keychain-loading')).toBeInTheDocument()
  })

  it('renderiza controles, grid, ambiente e preview', () => {
    render(<StudioViewport geometry={{} as never} resetCameraSignal={0} />)
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument()
    expect(screen.getByTestId('grid')).toBeInTheDocument()
    expect(screen.getByTestId('environment')).toBeInTheDocument()
    expect(screen.getByTestId('keychain-preview')).toBeInTheDocument()
  })

  it('posiciona o grid como piso distante abaixo da figura', () => {
    render(<StudioViewport geometry={{} as never} resetCameraSignal={0} />)
    expect(screen.getByTestId('grid')).toHaveAttribute('data-position', '0,-25,0')
  })
})
```

**Step 2: Rodar → FAIL** (grid sem prop position)

**Step 3: Atualizar `StudioViewport.tsx`** — mudanças: fundo `bg-neutral-100`, câmera `[40, 30, 80]`, Grid com `position [0, -25, 0]` e cores claras:

```tsx
import { Suspense, useEffect, useRef } from 'react'
import { Loader } from '@aws-amplify/ui-react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { BufferGeometry } from 'three'
import { Canvas } from '@react-three/fiber'
import { Environment, Grid, OrbitControls } from '@react-three/drei'
import { KeychainPreview } from './KeychainPreview'

interface StudioViewportProps {
  geometry: BufferGeometry | null
  resetCameraSignal: number
}

export function StudioViewport({ geometry, resetCameraSignal }: StudioViewportProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    if (resetCameraSignal > 0) {
      controlsRef.current?.reset()
    }
  }, [resetCameraSignal])

  return (
    <div
      role="img"
      aria-label="Visualização 3D do modelo"
      className="relative flex-1 bg-neutral-100"
    >
      {geometry ? null : (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Loader />
        </div>
      )}
      <Canvas
        shadows
        camera={{ position: [40, 30, 80], fov: 45 }}
        className="absolute inset-0"
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[80, 120, 60]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <KeychainPreview geometry={geometry} />
          <Grid
            position={[0, -25, 0]}
            args={[300, 300]}
            cellSize={10}
            cellColor="#d4d4d4"
            sectionSize={50}
            sectionColor="#a3a3a3"
            fadeDistance={150}
            infiniteGrid
          />
          <Environment preset="city" />
          <OrbitControls ref={controlsRef} makeDefault />
        </Suspense>
      </Canvas>
    </div>
  )
}
```

**Step 4: Atualizar `KeychainPreview.tsx`** — remover ContactShadows:

```tsx
import type { BufferGeometry } from 'three'

interface KeychainPreviewProps {
  geometry: BufferGeometry | null
}

export function KeychainPreview({ geometry }: KeychainPreviewProps) {
  if (!geometry) return null
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#14b8a6" metalness={0.1} roughness={0.4} />
    </mesh>
  )
}
```

**Step 5: Rodar → PASS** (inclui StudioPage.test — o mock do drei lá não tem ContactShadows, compatível)

Run: `npx vitest run tests/features/studio/`

**Step 6: Commit**

```bash
git add src/features/studio/components/StudioViewport.tsx src/features/studio/components/KeychainPreview.tsx tests/features/studio/components/StudioViewport.test.tsx
git commit -m "feat: viewport claro com grid distante e câmera frontal"
```

---

### Task 5: Tema claro em Topbar e StatusBar

**Files:**
- Modify: `src/features/studio/components/StudioTopbar.tsx`
- Modify: `src/features/studio/components/StudioStatusBar.tsx`

**Step 1: Atualizar `StudioTopbar.tsx`** — trocar classes escuras por claras:
- Container: `border-b border-neutral-800 bg-neutral-900` → `border-b border-neutral-200 bg-white`
- Marca: `text-white` → `text-neutral-900`
- Input do projeto: `border-neutral-700 bg-neutral-800 text-neutral-100 focus:border-teal-500` → `border-neutral-300 bg-white text-neutral-900 focus:border-teal-600`

**Step 2: Atualizar `StudioStatusBar.tsx`** — trocar classes:
- Container: `border-t border-neutral-800 bg-neutral-900` → `border-t border-neutral-200 bg-white`

(Textos já usam `color="font.tertiary"` do Amplify UI — renderizam claro automaticamente.)

**Step 3: Verificar testes existentes** (sem mudança de props — devem passar):

Run: `npm run test`

**Step 4: Commit**

```bash
git add src/features/studio/components/StudioTopbar.tsx src/features/studio/components/StudioStatusBar.tsx
git commit -m "feat: topbar e status bar com tema claro"
```

---

### Task 6: Docs + verificação final

**Files:**
- Modify: `docs/frontend/studio.md`

**Step 1: Atualizar `docs/frontend/studio.md`**

Ajustes na seção "Visão geral" e "Gerador de chaveiros":

- Toolbar: "**Toolbar** — formas (Retângulo/Círculo/Coração) e modo do texto
  (Relevo/Gravado) como ferramentas, além de Resetar câmera (funcional)"
- Painel: "**Parâmetros** — nome (1–12 chars, acentos normalizados) e sliders
  condensados (largura, altura, espessura, tamanho e profundidade do texto,
  diâmetro do furo)"
- Viewport: "**Viewport** — tema claro; chaveiro vertical com câmera frontal e
  grid distante como piso de fundo (não cruza a figura)"
- Decisões — adicionar:
  - "**Tema claro consistente com a landing** (painéis brancos, bordas
    neutral-200, ativos teal-600); componentes Amplify UI mantidos."
  - "**Gravação rasa:** o texto gravado corta apenas `textDepth` a partir da
    face frontal (epsilon 0.2 anti-coplanar) — o verso fica sólido e o texto
    nunca aparece espelhado por trás."
  - "**Grid distante (y=-25):** piso de fundo que nunca intersecta a figura."

**Step 2: Verificação final completa**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
git log --oneline -10
```

**Step 3: Verificação manual** (instruir o usuário — registrar no relatório da task):

```bash
npm run dev
# /studio:
# 1. Tema claro em todos os painéis (consistente com a landing)
# 2. Formas e modo do texto na coluna esquerda; sem botões decorativos
# 3. Painel direito condensado: nome + 6 sliders sem scroll em 1080p
# 4. Grid distante abaixo — girar a câmera: nunca cruza a figura
# 5. Modo Gravado: girar para trás — texto NUNCA aparece espelhado
# 6. Modo Relevo: inalterado
```

**Step 4: Commit**

```bash
git add docs/frontend/studio.md
git commit -m "docs: documenta reformulação visual do studio"
```

---

## Verification final (executor)

Ao término das 6 tasks, rodar e colar a saída de:

```bash
npm run lint && npm run typecheck && npm run test && npm run build
git log --oneline -8
```

Expected: 6 commits semânticos; todos os testes verdes (86 + novos do fix/toolbar/viewport); tema claro; gravação rasa coberta por teste.
