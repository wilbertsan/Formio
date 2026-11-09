# Topo de Bolo — Hastes cônicas e haste dupla: Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remover a fixação por base e implementar `haste` e `haste-dupla`, com ponta cônica proporcional ao diâmetro e espaçamento ajustável para a haste dupla.

**Architecture:** `supportType` passa a ser `'haste' | 'haste-dupla'`. O builder gera a haste como uma única `LatheGeometry` (cilindro + cone truncado). A haste dupla usa duas cópias ancoradas por raycast no fundo local da placa. O painel expõe as duas opções e o slider de espaçamento. Base, canaleta e CSG saem do topo de bolo.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, Amplify UI, Vitest.

**Design aprovado:** `docs/plans/2026-11-09-topo-bolo-hastes-conicas-design.md`

---

## Task 1: Hastes cônicas, haste dupla e remoção da base

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/schema.ts`
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts`
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.ts`
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx`

### Step 1: Atualizar os testes

1. Em `schema.test.ts`, adicione ao final do `describe('cakeTopperParamsSchema', ...)`:

```ts
  it('accepts haste-dupla as support type', () => {
    const valid = { ...defaultCakeTopperParams, supportType: 'haste-dupla' as const }
    expect(cakeTopperParamsSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects the removed base support type', () => {
    const invalid = { ...defaultCakeTopperParams, supportType: 'base' }
    expect(cakeTopperParamsSchema.safeParse(invalid).success).toBe(false)
  })

  it('defaults stemSpacing to 20mm', () => {
    expect(defaultCakeTopperParams.stemSpacing).toBe(20)
  })

  it('rejects stemSpacing out of range', () => {
    const invalid = { ...defaultCakeTopperParams, stemSpacing: 9 }
    expect(cakeTopperParamsSchema.safeParse(invalid).success).toBe(false)
  })
```

2. Em `useCakeTopper.test.ts`:
   - Troque o teste `'updateParam atualiza supportType'` para:

```ts
  it('updateParam atualiza supportType', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.updateParam('supportType', 'haste-dupla'))
    expect(result.current.params.supportType).toBe('haste-dupla')
  })
```

   - Remova o teste `'dimensions usa apenas height para base'`.
   - Acrescente:

```ts
  it('updateParam atualiza stemSpacing', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.updateParam('stemSpacing', 30))
    expect(result.current.params.stemSpacing).toBe(30)
  })

  it('dimensions inclui stemLength para haste dupla', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.updateParam('supportType', 'haste-dupla'))
    expect(result.current.dimensions.height).toBe(
      defaultCakeTopperParams.height + defaultCakeTopperParams.stemLength,
    )
  })
```

3. Em `buildCakeTopper.test.ts`:
   - Remova a constante `BASE_FLOOR` e os dois testes de base:
     - `'base é transladada para o lado da placa'`
     - `'base tem piso e forma um corpo conectado (canal não atravessa)'`
   - Remova os imports que ficarem sem uso:
```ts
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3, type BufferGeometry } from 'three'
```
   deve ficar:
```ts
import type { BufferGeometry } from 'three'
```
   - Acrescente, dentro de `describe('buildCakeTopper - fixação (support)', ...)`, depois do teste `'haste permanece centralizada em formas simétricas'`:

```ts
  it('haste tem ponta cônica', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'rounded-rect' as const,
      supportType: 'haste' as const,
    }
    const result = buildCakeTopper({ params })
    const support = result.support!
    support.computeBoundingBox()
    const bb = support.boundingBox!
    const centerX = (bb.min.x + bb.max.x) / 2
    const centerZ = (bb.min.z + bb.max.z) / 2
    const pos = support.getAttribute('position')

    let maxRadiusAtBottom = 0
    let maxRadiusAtTop = 0
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const radius = Math.hypot(pos.getX(i) - centerX, pos.getZ(i) - centerZ)
      if (y <= bb.min.y + 1e-6) maxRadiusAtBottom = Math.max(maxRadiusAtBottom, radius)
      if (y >= bb.max.y - 1e-6) maxRadiusAtTop = Math.max(maxRadiusAtTop, radius)
    }

    expect(maxRadiusAtBottom).toBeCloseTo(0.4, 1)
    expect(maxRadiusAtTop).toBeCloseTo(params.stemDiameter / 2, 1)
  })

  it('haste dupla gera duas hastes com o espaçamento configurado', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'rounded-rect' as const,
      supportType: 'haste-dupla' as const,
      stemSpacing: 30,
      stemDiameter: 4,
    }
    const result = buildCakeTopper({ params })
    const support = result.support!
    support.computeBoundingBox()
    const bb = support.boundingBox!

    expect(bb.max.x - bb.min.x).toBeCloseTo(params.stemSpacing + params.stemDiameter, 1)
    expect(bb.max.y - bb.min.y).toBeCloseTo(params.stemLength, 5)
  })
```

4. Em `StudioPanel.test.tsx`:
   - Troque o teste `'dispara onUpdateParam ao mudar o tipo de fixação'` para:

```ts
  it('dispara onUpdateParam ao mudar o tipo de fixação', () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    fireEvent.change(screen.getByLabelText('Tipo de fixação'), { target: { value: 'haste-dupla' } })
    expect(props.onUpdateParam).toHaveBeenCalledWith('supportType', 'haste-dupla')
  })
```

   - Substitua o teste `'mostra sliders de base quando supportType é base'` por:

```ts
  it('mostra o espaçamento apenas para haste dupla', () => {
    const props = createMockProps()
    const { rerender } = render(<StudioPanel {...props} />)
    expect(
      screen.queryByRole('slider', { name: /espaçamento das hastes/i }),
    ).not.toBeInTheDocument()

    rerender(
      <StudioPanel
        {...props}
        params={{ ...defaultCakeTopperParams, supportType: 'haste-dupla' }}
      />,
    )
    expect(screen.getByRole('slider', { name: /espaçamento das hastes/i })).toBeInTheDocument()
  })
```

### Step 2: Rodar os testes para confirmar a falha

Run:
```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx
```
Expected: FAIL nos novos casos de `haste-dupla`, `stemSpacing`, ponta cônica e espaçamento.

### Step 3: Atualizar o schema

Em `schema.ts`, troque:

```ts
  supportType: z.enum(['haste', 'base']),
  stemDiameter: z.number().min(3).max(8),
  stemLength: z.number().min(20).max(60),
  slotWidth: z.number().min(2.4).max(4.5),
  slotDepth: z.number().min(5).max(20),
  baseWidth: z.number().min(30).max(60),
  baseDepth: z.number().min(20).max(40),
```

por:

```ts
  supportType: z.enum(['haste', 'haste-dupla']),
  stemDiameter: z.number().min(3).max(8),
  stemLength: z.number().min(20).max(60),
  stemSpacing: z.number().min(10).max(40),
```

E em `defaultCakeTopperParams`, troque:

```ts
  supportType: 'haste', stemDiameter: 4, stemLength: 40,
  slotWidth: 3.4, slotDepth: 10, baseWidth: 50, baseDepth: 30,
```

por:

```ts
  supportType: 'haste', stemDiameter: 4, stemLength: 40, stemSpacing: 20,
```

### Step 4: Atualizar o hook

Em `useCakeTopper.ts`:

1. Em `NUMERIC_RANGES`, remova:
```ts
  slotWidth: { min: 2.4, max: 4.5 },
  slotDepth: { min: 5, max: 20 },
  baseWidth: { min: 30, max: 60 },
  baseDepth: { min: 20, max: 40 },
```
e adicione:
```ts
  stemSpacing: { min: 10, max: 40 },
```

2. Substitua o cálculo de `totalHeight`:
```ts
  const totalHeight = useMemo(
    () => params.height + (params.supportType === 'haste' ? params.stemLength : 0),
    [params.height, params.supportType, params.stemLength],
  )
```
por:
```ts
  const totalHeight = useMemo(
    () => params.height + params.stemLength,
    [params.height, params.stemLength],
  )
```

### Step 5: Atualizar o builder

Em `buildCakeTopper.ts`:

1. Imports de Three:
```ts
import {
  type BufferGeometry,
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Mesh,
  MeshBasicMaterial,
  Path,
  Raycaster,
  Shape,
  Vector2,
  Vector3,
} from 'three'
```
passa a ser:
```ts
import {
  type BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  Path,
  Raycaster,
  Shape,
  Vector2,
  Vector3,
} from 'three'
```

2. Remova o import de CSG:
```ts
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
```

3. Substitua as constantes de haste/base:
```ts
const STEM_EMBED = 2
const STEM_SEGMENTS = 24
const BASE_FLOOR = 3
const SLOT_CLEARANCE = 2
const BASE_GAP = 10
```
por:
```ts
const STEM_EMBED = 2
const STEM_SEGMENTS = 24
const STEM_TIP_RATIO = 2.5
const STEM_TIP_FLAT_DIAMETER = 0.8
const STEM_MAX_TIP_LENGTH_RATIO = 0.5
```

4. Remova a função `buildBase` inteira.

5. Substitua `plateBottomAnchorX` e `buildSupport` inteiros por:

```ts
interface PlateBottomSampler {
  minX: number
  maxX: number
  minY: number
  sample: (x: number) => number | null
  dispose: () => void
}

function createPlateBottomSampler(
  plate: BufferGeometry,
  thickness: number,
): PlateBottomSampler | null {
  plate.computeBoundingBox()
  const bb = plate.boundingBox
  if (!bb) return null

  const material = new MeshBasicMaterial({ side: DoubleSide })
  const mesh = new Mesh(plate, material)
  const raycaster = new Raycaster()
  const dir = new Vector3(0, -1, 0)
  const fromY = bb.max.y + 1

  return {
    minX: bb.min.x,
    maxX: bb.max.x,
    minY: bb.min.y,
    sample: (x: number) => {
      raycaster.set(new Vector3(x, fromY, thickness / 2), dir)
      const hits = raycaster.intersectObject(mesh, false)
      if (hits.length === 0) return null
      let bottom = Infinity
      for (const hit of hits) if (hit.point.y < bottom) bottom = hit.point.y
      return Number.isFinite(bottom) ? bottom : null
    },
    dispose: () => material.dispose(),
  }
}

// X onde a placa "pisa": o fundo mais baixo (empate → mais próximo de 0).
function plateBottomAnchorX(sampler: PlateBottomSampler): number {
  let bestX = 0
  let bestBottom = Infinity
  const step = 0.5
  for (let x = sampler.minX; x <= sampler.maxX + 1e-6; x += step) {
    const bottom = sampler.sample(x)
    if (bottom === null) continue
    const lower = bottom < bestBottom - 1e-6
    const tieNearCenter = Math.abs(bottom - bestBottom) <= 1e-6 && Math.abs(x) < Math.abs(bestX)
    if (lower || tieNearCenter) {
      bestBottom = bottom
      bestX = x
    }
  }
  return bestX
}

// Move X em direção ao centro até encontrar material da placa.
function resolveStemX(sampler: PlateBottomSampler, candidateX: number): number {
  const step = 0.5
  const direction = Math.sign(candidateX) || 1
  const maxSteps = Math.ceil(Math.abs(candidateX) / step)
  for (let i = 0; i <= maxSteps; i++) {
    const x = candidateX - direction * i * step
    if (sampler.sample(x) !== null) return x
  }
  return 0
}

function buildStem(
  params: CakeTopperParams,
  centerX: number,
  topY: number,
): BufferGeometry {
  const radius = params.stemDiameter / 2
  const tipRadius = STEM_TIP_FLAT_DIAMETER / 2
  const tipLength = Math.min(
    params.stemDiameter * STEM_TIP_RATIO,
    params.stemLength * STEM_MAX_TIP_LENGTH_RATIO,
  )

  // Perfil de baixo para cima: ponta plana → cone → corpo cilíndrico → topo.
  const points = [
    new Vector2(0, -params.stemLength),
    new Vector2(tipRadius, -params.stemLength),
    new Vector2(radius, -params.stemLength + tipLength),
    new Vector2(radius, 0),
    new Vector2(0, 0),
  ]

  const geometry = new LatheGeometry(points, STEM_SEGMENTS)
  geometry.translate(centerX, topY, params.thickness / 2)
  return geometry
}

function buildSupport(
  params: CakeTopperParams,
  plate: BufferGeometry,
  onError?: (message: string) => void,
): BufferGeometry | null {
  const sampler = createPlateBottomSampler(plate, params.thickness)
  if (!sampler) return null

  try {
    if (params.supportType === 'haste') {
      const anchorX = plateBottomAnchorX(sampler)
      const topY = (sampler.sample(anchorX) ?? sampler.minY) + STEM_EMBED
      return buildStem(params, anchorX, topY)
    }

    const halfSpacing = params.stemSpacing / 2
    const stems = [-halfSpacing, halfSpacing].map((candidateX) => {
      const x = resolveStemX(sampler, candidateX)
      const topY = (sampler.sample(x) ?? sampler.minY) + STEM_EMBED
      return buildStem(params, x, topY)
    })
    return mergeAll(stems, onError)
  } finally {
    sampler.dispose()
  }
}
```

### Step 6: Atualizar o painel

Em `StudioPanel.tsx`:

1. Em `SLIDER_LIMITS`, remova:
```ts
  slotWidth: { min: 2.4, max: 4.5, step: 0.1 },
  slotDepth: { min: 5, max: 20, step: 1 },
  baseWidth: { min: 30, max: 60, step: 1 },
  baseDepth: { min: 20, max: 40, step: 1 },
```
e adicione:
```ts
  stemSpacing: { min: 10, max: 40, step: 1 },
```

2. Na seção **Fixação**, troque o select:
```tsx
                <option value="haste">Haste (palito)</option>
                <option value="base">Base de encaixe</option>
```
por:
```tsx
                <option value="haste">Haste</option>
                <option value="haste-dupla">Haste dupla</option>
```

3. Substitua todo o bloco `{params.supportType === 'haste' ? ( ... ) : ( ... )}` por:

```tsx
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Diâmetro da haste</Text>
                <Text fontSize="xs" color="font.secondary">{params.stemDiameter} mm</Text>
              </Flex>
              <SliderField
                label="Diâmetro da haste"
                labelHidden
                aria-label="Diâmetro da haste"
                min={SLIDER_LIMITS.stemDiameter.min}
                max={SLIDER_LIMITS.stemDiameter.max}
                step={SLIDER_LIMITS.stemDiameter.step}
                value={params.stemDiameter}
                onChange={(value) => onUpdateParam('stemDiameter', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Comprimento da haste</Text>
                <Text fontSize="xs" color="font.secondary">{params.stemLength} mm</Text>
              </Flex>
              <SliderField
                label="Comprimento da haste"
                labelHidden
                aria-label="Comprimento da haste"
                min={SLIDER_LIMITS.stemLength.min}
                max={SLIDER_LIMITS.stemLength.max}
                step={SLIDER_LIMITS.stemLength.step}
                value={params.stemLength}
                onChange={(value) => onUpdateParam('stemLength', value as number)}
              />

              {params.supportType === 'haste-dupla' && (
                <>
                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Espaçamento das hastes</Text>
                    <Text fontSize="xs" color="font.secondary">{params.stemSpacing} mm</Text>
                  </Flex>
                  <SliderField
                    label="Espaçamento das hastes"
                    labelHidden
                    aria-label="Espaçamento das hastes"
                    min={SLIDER_LIMITS.stemSpacing.min}
                    max={SLIDER_LIMITS.stemSpacing.max}
                    step={SLIDER_LIMITS.stemSpacing.step}
                    value={params.stemSpacing}
                    onChange={(value) => onUpdateParam('stemSpacing', value as number)}
                  />
                </>
              )}
```

### Step 7: Rodar testes, typecheck e lint

Run:
```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/
npm run typecheck
npm run lint
```
Expected: PASS.

### Step 8: Commit

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/schema.ts \
  src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts \
  src/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.ts \
  src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx \
  tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx
git commit -m "feat(topo-bolo): adiciona hastes cônicas e haste dupla"
```

---

## Task 2: Atualizar a documentação

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md`
- Modify: `docs/frontend/studio.md`
- Modify: `src/features/studio/components/ToolSelector.tsx`

### Step 1: Atualizar o `AGENTS.md`

1. No objetivo, troque:
```md
Gerar toppers decorativos para bolo com múltiplos textos, ícone SVG e fixação por haste ou base.
```
por:
```md
Gerar toppers decorativos para bolo com múltiplos textos, ícone SVG e fixação por haste simples ou dupla.
```

2. Na seção `## Parâmetros`, troque:
```md
- Fixação: `haste` (cilindro integrado) ou `base` (peça separada com encaixe)
```
por:
```md
- Fixação: `haste` (uma haste) ou `haste-dupla` (duas hastes paralelas)
- Hastes: diâmetro 3–8mm, comprimento 20–60mm e ponta cônica proporcional ao diâmetro (plano final de 0,8mm)
- Espaçamento da haste dupla: 10–40mm (padrão 20mm)
```

3. Na seção `## Regras do domínio`, troque:
```md
- Fixação `haste`: cilindro embutido na placa (corpo único); `base`: peça separada com canaleta de encaixe, impressa ao lado da placa
```
por:
```md
- `haste`: haste vertical embutida 2mm na placa, com ponta cônica tipo lápis
- `haste-dupla`: duas hastes verticais paralelas, simétricas em X, cada uma ancorada no fundo local da placa; o espaçamento é ajustável
```

4. Na estrutura de arquivos, troque:
```md
- `buildCakeTopper.ts` — Geometria da placa, relevo alto (texto + ícone), canaleta da base (CSG) e fixação
```
por:
```md
- `buildCakeTopper.ts` — Geometria da placa, relevo alto (texto + ícone) e hastes cônicas
```

### Step 2: Atualizar `docs/frontend/studio.md`

1. Na lista da visão geral, troque:
```md
- **Topo de Bolo** — Toppers com texto em relevo alto, ícone SVG e fixação por haste ou base, com conteúdo unificado no painel
```
por:
```md
- **Topo de Bolo** — Toppers com texto em relevo alto, ícone SVG e fixação por haste ou haste dupla, com conteúdo unificado no painel
```

2. Na tabela de arquivos, troque:
```md
| Geometria multi-texto (placa, relevo alto, ícone, base, fixação) | `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts` |
```
por:
```md
| Geometria multi-texto (placa, relevo alto, ícone, hastes cônicas) | `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts` |
```

3. No bullet **Topo de Bolo**, troque o trecho:
```md
Fixação por `haste` (cilindro integrado) ou `base` separada com canaleta de encaixe.
```
por:
```md
Fixação por `haste` (uma haste) ou `haste-dupla` (duas hastes paralelas), com ponta cônica proporcional ao diâmetro e espaçamento ajustável na haste dupla.
```

### Step 3: Atualizar o `ToolSelector`

Troque:
```ts
    description: 'Toppers com texto em relevo alto, ícone SVG e fixação por haste ou base',
```
por:
```ts
    description: 'Toppers com texto em relevo alto, ícone SVG e fixação por haste ou haste dupla',
```

### Step 4: Verificar resíduos

Run:
```bash
grep -R "Base de encaixe\|slotWidth\|slotDepth\|baseWidth\|baseDepth\|haste ou base" src/features/studio/tools/confeitaria/topo-bolo src/features/studio/components/ToolSelector.tsx docs/frontend/studio.md
```
Expected: nenhuma ocorrência.

### Step 5: Commit

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md docs/frontend/studio.md src/features/studio/components/ToolSelector.tsx
git commit -m "docs(topo-bolo): documenta hastes cônicas e haste dupla"
```

---

## Task 3: Verificação final

### Step 1: Rodar a suíte completa

Run:
```bash
npm test
```
Expected: PASS.

### Step 2: Typecheck

Run:
```bash
npm run typecheck
```
Expected: PASS.

### Step 3: Lint

Run:
```bash
npm run lint
```
Expected: PASS.

### Step 4: Build

Run:
```bash
npm run build
```
Expected: PASS.

### Step 5: Revisar o diff

Run:
```bash
git status --short
git diff --stat
```
Expected: apenas os arquivos das tasks acima; nenhum temporário.
