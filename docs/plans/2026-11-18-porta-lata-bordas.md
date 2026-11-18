# Bordas decorativas do porta-lata — Plano de implementação

> **Para quem executa:** REQUIRED SUB-SKILL: use `superpowers:executing-plans`
> para implementar este plano tarefa a tarefa.

**Objetivo:** adicionar dois anéis salientes decorativos (base e topo) ao corpo
do porta-lata, compartilhando salto e largura, sem quebrar a alça, o texto, a
validação ou o export.

**Arquitetura:** os anéis entram como pontos extras no perfil 2D do corpo
(`bodyProfile`), que continua alimentando um único `LatheGeometry`. Os
parâmetros novos ficam no schema Zod e fluem pelo hook/worker já existentes. A
faixa disponível para a banda da alça e para o texto passa a descontar a largura
dos anéis.

**Stack:** React 19, TypeScript strict, Three.js, Zod, Vitest, Amplify UI.

**Design aprovado:** `docs/plans/2026-11-18-porta-lata-bordas-design.md`.

**Regras do projeto:** 1 unidade = 1 mm; sem `any`; sem código morto; commits
semânticos; toda validação de entrada via Zod; o corpo continua single-shell.

---

## Task 1: Schema, defaults e derivados dos anéis

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/schema.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts`

**Step 1: escrever os testes que falham**

No import de `schema.test.ts`, adicione `getEffectiveRingProtrusion` e
`getMaxOuterDiameter` à lista.

No teste `defaults válidos`, adicione ao `toMatchObject`:

```ts
      rimChamfer: 0.4,
      edgeRimEnabled: true,
      edgeRimProtrusion: 1.0,
      edgeRimWidth: 6,
```

No teste `rejeita dimensões e folgas fora da faixa`, adicione:

```ts
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, edgeRimProtrusion: 0.3 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, edgeRimProtrusion: 1.6 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, edgeRimWidth: 3 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, edgeRimWidth: 15 }).success).toBe(false)
```

No teste `aceita os limites da faixa`, adicione:

```ts
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, edgeRimProtrusion: 0.4 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, edgeRimProtrusion: 1.5 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, edgeRimWidth: 4 }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, edgeRimWidth: 14 }).success).toBe(true)
```

Em `calcula as dimensões derivadas no default`, troque a expectativa da parede
do topo e adicione o diâmetro máximo:

```ts
    expect(getTopLand(defaultCanHolderParams)).toBeCloseTo(2.0, 5)
    expect(getMaxOuterDiameter(defaultCanHolderParams)).toBeCloseTo(74.6, 5)
```

Em `limita a borda de entrada para preservar a parede do topo`, a parede do topo
agora soma o salto do anel:

```ts
    expect(getTopLand(params)).toBeCloseTo(1.8, 5)
```

Adicione um teste novo:

```ts
  it('calcula o salto efetivo dos anéis', () => {
    expect(getEffectiveRingProtrusion(defaultCanHolderParams)).toBeCloseTo(1, 5)
    expect(
      getEffectiveRingProtrusion({ ...defaultCanHolderParams, edgeRimEnabled: false }),
    ).toBe(0)

    // Defensivo: fora do schema (largura < 4) o salto encolhe para sobrar 1 mm
    // de face plana no centro do anel: (3 - 1) / 2 = 1 mm de cada lado.
    expect(
      getEffectiveRingProtrusion({
        ...defaultCanHolderParams,
        edgeRimWidth: 3,
        edgeRimProtrusion: 1.5,
      }),
    ).toBeCloseTo(1, 5)

    // Entrada válida na fronteira: o clamp não altera.
    expect(
      getEffectiveRingProtrusion({
        ...defaultCanHolderParams,
        edgeRimWidth: 4,
        edgeRimProtrusion: 1.5,
      }),
    ).toBeCloseTo(1.5, 5)
  })

  it('desliga os anéis sem alterar o diâmetro externo', () => {
    const params = { ...defaultCanHolderParams, edgeRimEnabled: false }
    expect(getMaxOuterDiameter(params)).toBeCloseTo(getOuterDiameter(params), 5)
  })
```

**Step 2: rodar e confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts
```

Esperado: falha de import (`getEffectiveRingProtrusion` não existe) e
expectativas de `getTopLand` divergentes.

**Step 3: implementar o mínimo**

Em `schema.ts`, depois de `BASE_CHAMFER_MM`:

```ts
/** Face plana mínima no centro do anel decorativo. */
export const MIN_EDGE_RIM_FLAT_MM = 1
```

No `canHolderParamsSchema`, logo depois de `rimChamfer`:

```ts
  edgeRimEnabled: z.boolean(),
  edgeRimProtrusion: z.number().min(0.4).max(1.5),
  edgeRimWidth: z.number().min(4).max(14),
```

Em `defaultCanHolderParams`, depois de `rimChamfer`:

```ts
  edgeRimEnabled: true,
  edgeRimProtrusion: 1.0,
  edgeRimWidth: 6,
```

Depois de `getEffectiveRimChamfer`:

```ts
/**
 * Salto radial efetivo dos anéis: 0 quando desligados e limitado para sobrar
 * `MIN_EDGE_RIM_FLAT_MM` de face plana entre os flancos de 45°.
 *
 * O clamp é defensivo; inalcançável pelo schema (`edgeRimWidth` ≥ 4 e
 * `edgeRimProtrusion` ≤ 1,5). Ele só reduz objetos construídos fora do Zod.
 */
export function getEffectiveRingProtrusion(params: CanHolderGeometryParams): number {
  if (!params.edgeRimEnabled) return 0
  return Math.max(
    0,
    Math.min(
      params.edgeRimProtrusion,
      (params.edgeRimWidth - MIN_EDGE_RIM_FLAT_MM) / 2,
    ),
  )
}

/** Diâmetro externo do corpo com os anéis decorativos (não inclui o relevo do texto). */
export function getMaxOuterDiameter(params: CanHolderGeometryParams): number {
  return (getOuterRadius(params) + getEffectiveRingProtrusion(params)) * 2
}
```

Substitua `getTopLand`:

```ts
export function getTopLand(params: CanHolderGeometryParams): number {
  return (
    params.wallThickness -
    getEffectiveRimChamfer(params) -
    getEffectiveLeadIn(params) +
    getEffectiveRingProtrusion(params)
  )
}
```

**Step 4: rodar e confirmar o sucesso**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts
```

Esperado: todos os testes do arquivo passando.

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/schema.ts tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts
git commit -m "feat: add can holder edge rim parameters"
```

---

## Task 2: Anéis no perfil do corpo

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/shapes.ts:33-54`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts`

**Step 1: escrever os testes que falham**

No import de `buildBody.test.ts`, adicione:

```ts
import {
  BASE_CHAMFER_MM,
  getEffectiveRingProtrusion,
  getEffectiveRimChamfer,
  getMaxOuterDiameter,
  getOuterRadius,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
```

(o import de schema hoje já traz `getOuterDiameter`; mantenha e acrescente os
novos.)

Troque a expectativa do bbox no primeiro teste:

```ts
    expect(box.max.x).toBeCloseTo(getMaxOuterDiameter(defaultCanHolderParams) / 2, 2)
```

Adicione os testes:

```ts
  it('gera os anéis decorativos colados na base e no topo', () => {
    const params = defaultCanHolderParams
    const protrusion = getEffectiveRingProtrusion(params)
    const ringRadius = getOuterRadius(params) + protrusion
    const height = getOuterHeight(params)
    const points = bodyProfile(params)

    expect(protrusion).toBeGreaterThan(0)
    const ringPoints = points
      .filter((point) => Math.abs(point.x - ringRadius) < 1e-6)
      .map((point) => point.y)

    expect(ringPoints).toHaveLength(4)
    expect(ringPoints[0]).toBeCloseTo(BASE_CHAMFER_MM, 6)
    expect(ringPoints[1]).toBeCloseTo(params.edgeRimWidth - protrusion, 6)
    expect(ringPoints[2]).toBeCloseTo(height - params.edgeRimWidth + protrusion, 6)
    expect(ringPoints[3]).toBeCloseTo(height - getEffectiveRimChamfer(params), 6)
  })

  it('sem anéis, o perfil volta ao corpo reto', () => {
    const params = { ...defaultCanHolderParams, edgeRimEnabled: false }
    const radius = getOuterRadius(params)
    const points = bodyProfile(params)

    expect(points.some((point) => point.x > radius + 1e-6)).toBe(false)
    expect(points.some((point) => Math.abs(point.x - radius) < 1e-6)).toBe(true)
  })
```

No `it.each` de extremos, adicione três casos:

```ts
    { name: 'bordas desligadas', params: { edgeRimEnabled: false } },
    { name: 'bordas mínimas', params: { edgeRimProtrusion: 0.4, edgeRimWidth: 4 } },
    { name: 'bordas máximas', params: { edgeRimProtrusion: 1.5, edgeRimWidth: 14 } },
```

**Step 2: rodar e confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts
```

Esperado: bbox em 36,3 em vez de 37,3 e falha dos testes de anel.

**Step 3: implementar o mínimo**

Em `shapes.ts`, adicione `getEffectiveRingProtrusion` ao import de `./schema` e
substitua `bodyProfile` por:

```ts
export function bodyProfile(params: CanHolderGeometryParams): Vector2[] {
  const outerR = getOuterRadius(params)
  const innerR = getInnerDiameter(params) / 2
  const ventR = params.ventHoleDiameter / 2
  const height = getOuterHeight(params)
  const leadIn = getEffectiveLeadIn(params)
  const chamfer = getEffectiveRimChamfer(params)
  const base = Math.min(BASE_CHAMFER_MM, outerR * 0.2)
  const protrusion = getEffectiveRingProtrusion(params)

  if (protrusion === 0) {
    return dedupePoints([
      new Vector2(ventR, 0),
      new Vector2(outerR - base, 0),
      new Vector2(outerR, base),
      new Vector2(outerR, height - chamfer),
      new Vector2(outerR - chamfer, height),
      new Vector2(innerR + leadIn, height),
      new Vector2(innerR, height - leadIn),
      new Vector2(innerR, params.bottomThickness),
      new Vector2(ventR, params.bottomThickness),
      new Vector2(ventR, 0),
    ])
  }

  const ringR = outerR + protrusion
  const width = params.edgeRimWidth

  return dedupePoints([
    new Vector2(ventR, 0),
    new Vector2(ringR - base, 0),
    new Vector2(ringR, base),
    new Vector2(ringR, width - protrusion),
    new Vector2(outerR, width),
    new Vector2(outerR, height - width),
    new Vector2(ringR, height - width + protrusion),
    new Vector2(ringR, height - chamfer),
    new Vector2(ringR - chamfer, height),
    new Vector2(innerR + leadIn, height),
    new Vector2(innerR, height - leadIn),
    new Vector2(innerR, params.bottomThickness),
    new Vector2(ventR, params.bottomThickness),
    new Vector2(ventR, 0),
  ])
}
```

Atualize também o comentário do perfil para citar os anéis:

```ts
/**
 * Perfil fechado no plano (r, y) para o LatheGeometry:
 * furo de ventilação → fundo externo → anel inferior → parede → anel superior →
 * borda → parede interna → fundo interno → furo. O primeiro e o último ponto
 * coincidem para fechar a superfície; o perfil não toca o eixo, então não há
 * leques degenerados.
 */
```

**Step 4: rodar e confirmar o sucesso**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts
```

Esperado: todos passando, inclusive manifold (`isClosed`, `countShells` 1).

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/shapes.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts
git commit -m "feat: add decorative rims to can holder profile"
```

---

## Task 3: Faixa do texto, relevo e validação dos anéis

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/schema.ts` (helper `getTextBand`)
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/buildRelief.ts` (`clampCenterY`)
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.test.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/buildRelief.test.ts`

**Step 0: helper único da faixa do texto**

A revisão da Tarefa 2 mostrou que `clampCenterY` (buildRelief) e a validação
calculam a faixa do texto separadamente; com anéis, o build precisa da mesma
regra para não deixar o relevo sobre o anel. Extraia um helper em `schema.ts`,
depois de `getTopLand`:

```ts
export interface TextBand {
  min: number
  max: number
}

/**
 * Faixa vertical disponível para o texto: entre o fundo e a borda de entrada,
 * descontando os anéis decorativos quando ligados, com `TEXT_BAND_MARGIN_MM` de
 * margem em cada ponta.
 */
export function getTextBand(params: CanHolderGeometryParams): TextBand {
  const ringWidth = params.edgeRimEnabled ? params.edgeRimWidth : 0
  return {
    min: Math.max(params.bottomThickness, ringWidth) + TEXT_BAND_MARGIN_MM,
    max:
      getOuterHeight(params) -
      Math.max(getEffectiveRimChamfer(params), ringWidth) -
      TEXT_BAND_MARGIN_MM,
  }
}
```

**Step 1: escrever os testes que falham**

Atualize os três testes de limite que dependem da faixa:

1. Em `aceita texto exatamente no limite superior da faixa`, troque:

```ts
    const ceiling =
      getOuterHeight(params) -
      Math.max(getEffectiveRimChamfer(params), params.edgeRimWidth) -
      TEXT_BAND_MARGIN_MM
```

2. Em `aceita a banda exatamente no limite superior do corpo`, desligue os anéis
   (o teste é sobre o chanfro do topo) e ajuste o comentário:

```ts
    // Corpo de 95 mm + chanfro 0 → topo útil 93 mm; banda 85 ± 8 → 93 mm.
    // Anéis desligados: o limite superior volta a ser o chanfro do corpo.
    const params = withParams({
      cavityDepth: 91.8,
      bottomThickness: 3.2,
      rimChamfer: 0,
      edgeRimEnabled: false,
      handleHeight: 85,
      handleWidth: 16,
    })
```

3. Em `aceita os limites exatos de cavidade, folga, borda, fundo, texto e alça`,
   troque o piso da faixa do texto:

```ts
    const floor = Math.max(bottom.bottomThickness, bottom.edgeRimWidth) + TEXT_BAND_MARGIN_MM
```

Adicione os testes:

```ts
  it('aponta salto grande demais para a largura da borda (defensivo)', () => {
    const issues = validateCanHolder(withParams({ edgeRimWidth: 3, edgeRimProtrusion: 1.5 }))
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'can-edge-rim', severity: 'error' }),
    )
    expect(
      validateCanHolder(defaultCanHolderParams).some(
        (issue) => issue.code === 'can-edge-rim',
      ),
    ).toBe(false)
  })

  it('aponta bordas que ocupam a altura toda do corpo (defensivo)', () => {
    const issues = validateCanHolder(withParams({ edgeRimWidth: 60 }))
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'can-edge-rim', severity: 'error' }),
    )
  })

  it('mantém a banda da alça entre os anéis', () => {
    // Corpo de 103,2 mm; banda de 77–93 mm. Com anéis de 14 mm o topo útil cai
    // para 87,2 mm; sem anéis o limite é o chanfro, em 100,8 mm.
    const betweenRings = withParams({
      cavityDepth: 100,
      edgeRimWidth: 14,
      handleHeight: 85,
      handleWidth: 16,
    })
    expect(validateCanHolder(betweenRings)).toContainEqual(
      expect.objectContaining({ code: 'can-handle-band', severity: 'error' }),
    )
    expect(
      validateCanHolder(betweenRings).some((issue) => issue.code === 'can-cavity'),
    ).toBe(false)

    const withoutRings = { ...betweenRings, edgeRimEnabled: false }
    expect(
      validateCanHolder(withoutRings).some((issue) => issue.code === 'can-handle-band'),
    ).toBe(false)
  })

  it('mantém o texto entre os anéis', () => {
    const high = withParams({ cavityDepth: 100, textCenterY: 90, textSize: 18 })
    expect(validateCanHolder(high)).toContainEqual(
      expect.objectContaining({ code: 'can-text-band', severity: 'error' }),
    )
    expect(
      validateCanHolder({ ...high, edgeRimEnabled: false }).some(
        (issue) => issue.code === 'can-text-band',
      ),
    ).toBe(false)

    const low = withParams({ textCenterY: 20, textSize: 18, edgeRimWidth: 14 })
    expect(validateCanHolder(low)).toContainEqual(
      expect.objectContaining({ code: 'can-text-band', severity: 'error' }),
    )
    expect(
      validateCanHolder({ ...low, edgeRimEnabled: false }).some(
        (issue) => issue.code === 'can-text-band',
      ),
    ).toBe(false)
  })
```

Em `buildRelief.test.ts`:

1. Nos testes focados no chanfro (`clampa o texto com o chanfro efetivo quando o
   chanfro pedido é limitado`, `respeita o chanfro efetivo quando o lead-in
   limita o perfil`, `clampa o texto dentro do corpo mais curto`), adicione
   `edgeRimEnabled: false` aos params e um comentário de uma linha: os anéis têm
   teste próprio e mudariam o teto.
2. Em `clampa o texto para dentro da parede quando o centro pede a borda`, o
   teto e o piso agora incluem os anéis:

```ts
    const ceiling =
      getOuterHeight(params) - params.edgeRimWidth - TEXT_BAND_MARGIN_MM
    ...
    expect(box.min.y).toBeGreaterThanOrEqual(params.edgeRimWidth + TEXT_BAND_MARGIN_MM - POSITION_EPSILON)
    expect(box.max.y).toBeLessThanOrEqual(ceiling + POSITION_EPSILON)
```

3. Adicione o teste do anel largo:

```ts
  it('clampa o texto entre os anéis', () => {
    const params = {
      ...defaultCanHolderParams,
      edgeRimWidth: 14,
      textCenterY: 120,
    }
    const geometry = buildRelief(rectangleFont(10, 4), params)!
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const ceiling =
      getOuterHeight(params) - params.edgeRimWidth - TEXT_BAND_MARGIN_MM

    expect(box.min.y).toBeGreaterThanOrEqual(14 + TEXT_BAND_MARGIN_MM - POSITION_EPSILON)
    expect(box.max.y).toBeCloseTo(ceiling, 5)
    geometry.dispose()
  })
```

**Step 2: rodar e confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildRelief.test.ts
```

Esperado: `can-edge-rim` desconhecido/ausente, testes de faixa falhando e os
testes de clamp do relevo com teto antigo.

**Step 3: implementar o mínimo**

Em `buildRelief.ts`, troque o corpo de `clampCenterY` e limpe os imports:

```ts
function clampCenterY(params: CanHolderGeometryParams, halfHeight: number): number {
  const band = getTextBand(params)
  const minY = band.min + halfHeight
  const maxY = band.max - halfHeight
  if (minY > maxY) return params.textCenterY
  return Math.min(maxY, Math.max(minY, params.textCenterY))
}
```

Importe `getTextBand` de `./schema` e remova `TEXT_BAND_MARGIN_MM`,
`getEffectiveRimChamfer` e `getOuterHeight` do import (ficam sem uso).

Em `validateCanHolder.ts`, use o mesmo helper no bloco do texto:

```ts
    const band = getTextBand(params)
    const fitScale = Math.min(1, MAX_TEXT_ARC / arc)
    const halfHeight = ((params.textSize * GLYPH_HEIGHT_FACTOR) / 2) * fitScale
    if (
      params.textCenterY - halfHeight < band.min ||
      params.textCenterY + halfHeight > band.max
    ) {
```

Importe `getTextBand` de `./schema`. O restante da validação segue como abaixo.

No import de `schema`, adicione `MIN_EDGE_RIM_FLAT_MM` e remova
`TEXT_BAND_MARGIN_MM`, que fica sem uso em `validateCanHolder.ts`.

Adicione `'can-edge-rim'` ao tipo `CanHolderIssueCode`.

Depois da regra `can-bottom`:

```ts
  if (params.edgeRimEnabled) {
    // Regra crua, antes do clamp de `getEffectiveRingProtrusion`.
    if (
      2 * params.edgeRimProtrusion + MIN_EDGE_RIM_FLAT_MM >
      params.edgeRimWidth + BOUNDARY_EPSILON
    ) {
      issues.push({
        code: 'can-edge-rim',
        severity: 'error',
        message: `As bordas decorativas precisam de ${MIN_EDGE_RIM_FLAT_MM} mm de face plana. Reduza o salto ou aumente a largura.`,
      })
    }

    if (
      2 * params.edgeRimWidth + 2 * HANDLE_MARGIN_MM >
      getOuterHeight(params) + BOUNDARY_EPSILON
    ) {
      issues.push({
        code: 'can-edge-rim',
        severity: 'error',
        message: 'As bordas decorativas não cabem na altura do corpo.',
      })
    }
  }
```

No bloco da alça, troque os limites:

```ts
    const ringWidth = params.edgeRimEnabled ? params.edgeRimWidth : 0
    const bandMinY = params.handleHeight - params.handleWidth / 2
    const bandMaxY = params.handleHeight + params.handleWidth / 2
    const lowerLimit = ringWidth + HANDLE_MARGIN_MM
    const upperLimit = params.edgeRimEnabled
      ? getOuterHeight(params) - ringWidth - HANDLE_MARGIN_MM
      : getOuterHeight(params) - chamfer - HANDLE_MARGIN_MM
    if (bandMinY < lowerLimit || bandMaxY > upperLimit) {
      issues.push({
        code: 'can-handle-band',
        severity: 'error',
        message: 'A alça não cabe na altura do corpo. Ajuste a altura ou a largura da alça.',
      })
    }
```

Atualize o comentário acima da regra para citar os anéis.

**Step 4: rodar e confirmar o sucesso**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildRelief.test.ts
```

Esperado: todos passando.

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/schema.ts src/features/studio/tools/lembrancinhas/porta-lata/buildRelief.ts src/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.ts tests/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildRelief.test.ts
git commit -m "feat: keep can holder text inside the edge rims"
```

---

## Task 4: Hook com os novos parâmetros e diâmetro máximo

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.test.ts`

**Step 1: escrever os testes que falham**

Em `retorna os defaults e as dimensões nominais`:

```ts
    expect(result.current.dimensions).toEqual({ width: 74.6, height: 111.2, thickness: 2.4 })
    expect(result.current.outerDiameter).toBeCloseTo(74.6, 5)
```

Em `usa o snapshot do build nos valores derivados`:

```ts
    expect(result.current.outerDiameter).toBeCloseTo(74.6, 5)
    ...
    expect(result.current.outerDiameter).toBeCloseTo(75.8, 5)
```

Em `envia ao worker após o debounce sem as cores`, adicione ao objeto esperado,
depois de `rimChamfer`:

```ts
      edgeRimEnabled: true,
      edgeRimProtrusion: 1.0,
      edgeRimWidth: 6,
```

Em `faz clamp dos campos numéricos`, adicione:

```ts
      result.current.updateParam('edgeRimProtrusion', 9)
      result.current.updateParam('edgeRimWidth', 1)
```
e
```ts
      result.current.updateParam('edgeRimProtrusion', 0)
      result.current.updateParam('edgeRimWidth', 99)
```
com as expectativas:
```ts
    expect(result.current.params.edgeRimProtrusion).toBe(1.5)
    expect(result.current.params.edgeRimWidth).toBe(4)
```
e
```ts
    expect(result.current.params.edgeRimProtrusion).toBe(0.4)
    expect(result.current.params.edgeRimWidth).toBe(14)
```

Adicione um teste de switch:

```ts
  it('mantém edgeRimEnabled booleano', () => {
    const { factory, getParams } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))

    act(() => { result.current.updateParam('edgeRimEnabled', false) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(getParams()?.edgeRimEnabled).toBe(false)
  })
```

**Step 2: rodar e confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.test.ts
```

Esperado: largura 72,6 e campos de anel ausentes no objeto enviado ao worker.

**Step 3: implementar o mínimo**

Em `useCanHolder.ts`:

1. Troque `getOuterDiameter` por `getMaxOuterDiameter` no import de `./schema`.
2. Em `NUMERIC_RANGES`, depois de `rimChamfer`:

```ts
  edgeRimProtrusion: { min: 0.4, max: 1.5 },
  edgeRimWidth: { min: 4, max: 14 },
```

3. Na desestruturação de `params`, adicione `edgeRimEnabled, edgeRimProtrusion, edgeRimWidth` depois de `rimChamfer`.
4. No objeto e no array de dependências do `useMemo` de `buildParams`, adicione os três campos na mesma posição.
5. No `derived`, troque a chamada:

```ts
    outerDiameter: getMaxOuterDiameter(nominalParams),
```

6. No `fallbackFitRadius`, troque as duas ocorrências de `getOuterDiameter(nominalParams)` por `getMaxOuterDiameter(nominalParams)`.
7. Em `dimensions`, troque a largura:

```ts
      width: Number(getMaxOuterDiameter(nominalParams).toFixed(1)),
```

**Step 4: rodar e confirmar o sucesso**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.test.ts
```

Esperado: todos passando.

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.ts tests/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.test.ts
git commit -m "feat: wire can holder edge rims into the hook"
```

---

## Task 5: Painel com a seção Bordas

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.tsx`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.test.tsx`

**Step 1: escrever os testes que falham**

Em `SLIDER_RANGES`, depois de `Chanfro da borda`:

```ts
  { name: 'Salto das bordas', min: 0.4, max: 1.5 },
  { name: 'Largura das bordas', min: 4, max: 14 },
```

Em `renderiza heading, restaurar e as cinco seções`, renomeie para `seis
seções`, adicione `Bordas` e ajuste a ordem:

```ts
    expect(screen.getByText('Corpo')).toBeDefined()
    expect(screen.getByText('Bordas')).toBeDefined()
```

Em `expõe nome acessível nos 15 sliders` e `expõe aria-valuemin e aria-valuemax
dos 15 sliders`, troque "15" por "17" e a asserção de comprimento para 17.

Em `mostra o preset da lata e as dimensões derivadas`, atualize a parede do topo
para o valor com anel:

```ts
    expect(screen.getByText('Parede do topo: 2,0 mm')).toBeDefined()
```

Adicione:

```ts
const RIM_SLIDERS = ['Salto das bordas', 'Largura das bordas'] as const
const RIM_DISABLED_HINT = 'Ligue as bordas para ajustar os parâmetros.'

  it('desabilita os sliders das bordas quando elas estão desligadas', () => {
    const onUpdateParam = vi.fn()
    const { rerender } = render(
      <StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />,
    )
    for (const name of RIM_SLIDERS) {
      expect.soft(screen.getByRole('slider', { name }), name).not.toHaveAttribute(
        'data-disabled',
      )
    }
    expect(screen.queryByText(RIM_DISABLED_HINT)).toBeNull()

    fireEvent.click(screen.getByLabelText('Habilitar bordas'))
    expect(onUpdateParam).toHaveBeenCalledWith('edgeRimEnabled', false)

    onUpdateParam.mockClear()
    rerender(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultCanHolderParams, edgeRimEnabled: false }}
        onUpdateParam={onUpdateParam}
      />,
    )
    for (const name of RIM_SLIDERS) {
      expect.soft(screen.getByRole('slider', { name }), name).toHaveAttribute(
        'data-disabled',
      )
    }
    expect(screen.getByText(RIM_DISABLED_HINT)).toBeDefined()
  })

  it('mostra a faixa útil do texto entre as bordas', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Texto entre 8,0 e 103,2 mm')).toBeDefined()
  })

  it('acompanha a largura das bordas na faixa do texto', () => {
    render(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultCanHolderParams, edgeRimWidth: 14 }}
      />,
    )
    expect(screen.getByText('Texto entre 16,0 e 95,2 mm')).toBeDefined()
  })
```

Em `incrementa pelos passos decimais dos sliders`, adicione:

```ts
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Salto das bordas' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenLastCalledWith('edgeRimProtrusion', 1.1)

    fireEvent.keyDown(screen.getByRole('slider', { name: 'Largura das bordas' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenLastCalledWith('edgeRimWidth', 7)
```

**Step 2: rodar e confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.test.tsx
```

Esperado: seção/sliders ausentes.

**Step 3: implementar o mínimo**

Em `StudioPanel.tsx`, importe `getTextBand` de `./schema`, calcule
`const textBand = getTextBand(params)` no corpo do componente e adicione um
`Accordion.Item` entre `corpo` e `alca`:

```tsx
        <Accordion.Item value="bordas">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Bordas</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SwitchField
                label="Habilitar bordas"
                isChecked={params.edgeRimEnabled}
                onChange={(event) => onUpdateParam('edgeRimEnabled', event.target.checked)}
              />
              <LabeledSlider label="Salto das bordas" value={params.edgeRimProtrusion} min={0.4} max={1.5} step={0.1} isDisabled={!params.edgeRimEnabled} onChange={(value) => onUpdateParam('edgeRimProtrusion', value)} />
              <LabeledSlider label="Largura das bordas" value={params.edgeRimWidth} min={4} max={14} step={1} isDisabled={!params.edgeRimEnabled} onChange={(value) => onUpdateParam('edgeRimWidth', value)} />
              {params.edgeRimEnabled ? (
                <Text fontSize="xs" color="font.secondary">
                  Texto entre {formatMm(textBand.min)} e {formatMm(textBand.max)} mm
                </Text>
              ) : (
                <Text fontSize="xs" color="font.secondary">
                  Ligue as bordas para ajustar os parâmetros.
                </Text>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
```

`outerHeight` já é prop do painel; não é preciso mudar a interface. Nenhum
import novo é necessário (`formatMm` já existe).

**Step 4: rodar e confirmar o sucesso**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.test.tsx
```

Esperado: todos passando.

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.tsx tests/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.test.tsx
git commit -m "feat: add edge rim controls to can holder panel"
```

---

## Task 6: Bbox do build completo

**Arquivos:**
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.test.ts`

**Step 1: ajustar o teste**

No import de `schema`, troque `getOuterDiameter` por `getMaxOuterDiameter` e
atualize:

```ts
    expect(box.max.x).toBeCloseTo(getMaxOuterDiameter(defaultCanHolderParams) / 2, 2)
```

**Step 2: rodar**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.test.ts
```

Esperado: falha em 36,3 antes do ajuste e sucesso depois (o código de produção
já foi alterado na Task 2).

**Step 3: commit**

```bash
git add tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.test.ts
git commit -m "test: cover can holder edge rims in full build"
```

---

## Task 7: Documentação

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/AGENTS.md`
- Modificar: `src/features/studio/tools/lembrancinhas/AGENTS.md`
- Modificar: `docs/frontend/studio.md`
- Modificar: `docs/plans/2026-11-18-porta-lata-bordas-design.md`

**Step 1: `porta-lata/AGENTS.md`**

- Objetivo: citar os dois anéis decorativos colados nas extremidades.
- Parâmetros do corpo: adicionar a tabela dos três campos, a faixa 0,4–1,5/1,0
  e 4–14/6, e a nota de clamp `(largura − 1) / 2`.
- Dimensões derivadas: diâmetro externo default **74,6 mm** (72,6 do corpo +
  2 × 1,0), parede do topo **2,0 mm**, faixa livre entre bordas **99,2 mm**.
- Regras do domínio: descrever o perfil com anéis (dois flancos de 45°), anel
  inferior apoiado na mesa, anel superior sem suporte, `getTopLand` somando o
  salto e `getMaxOuterDiameter` para painel/status.
- Validação: `can-edge-rim` na tabela; `can-text-band` e `can-handle-band`
  descontando a largura dos anéis.
- Decisões da v1: anéis compartilhados, perfil trapezoidal, sem recorte na alça,
  `p ≤ 1,5` mantém o laço com folga.

**Step 2: `lembrancinhas/AGENTS.md`**

Na regra do porta-lata, acrescentar: "bordas decorativas de 0,4–1,5 mm de salto
e 4–14 mm de largura, coladas na base e no topo, com flancos a 45°".

**Step 3: `docs/frontend/studio.md`**

Na seção **Porta-lata**:
- pipeline `shapes.ts` com os anéis;
- parâmetros do corpo com `edgeRimEnabled`, `edgeRimProtrusion` e
  `edgeRimWidth`;
- dimensões derivadas atualizadas (74,6 mm e parede do topo 2,0 mm);
- lista de validação com `can-edge-rim`;
- decisão do porta-lata no fim do documento citando os anéis.

**Step 4: marcar o design como implementado**

No topo de `docs/plans/2026-11-18-porta-lata-bordas-design.md`, trocar o status
para `design aprovado; implementado` e registrar os desvios encontrados:

- a constante da face plana foi implementada como `MIN_EDGE_RIM_FLAT_MM`
  (o design a chamava `MIN_RING_FLAT_MM`);
- o perfil do design omite o ponto vertical `(ringR, height − chamfer)` entre o
  flanco superior e o chanfro da borda; a implementação o inclui, senão o anel
  superior perde a face vertical e o `getTopLand` não fecha;
- `getMaxOuterDiameter` não inclui o relevo de 1 mm do texto — é o diâmetro do
  corpo com os anéis, coerente com a convenção de medidas nominais do status
  bar;
- o clamp de `getEffectiveRingProtrusion` e a regra `can-edge-rim` são
  defensivos: inalcançáveis pelo schema e pela UI.

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/AGENTS.md src/features/studio/tools/lembrancinhas/AGENTS.md docs/frontend/studio.md docs/plans/2026-11-18-porta-lata-bordas-design.md
git commit -m "docs: document can holder edge rims"
```

---

## Task 8: Verificação final

**Step 1: suíte do porta-lata**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata
```

Esperado: todos os arquivos passando, incluindo worker, export e CSG.

**Step 2: suíte completa**

```bash
npm test
```

Esperado: sem regressões fora do porta-lata.

**Step 3: typecheck**

```bash
npm run typecheck
```

Esperado: sem erros.

**Step 4: lint**

```bash
npm run lint
```

Esperado: sem erros nem warnings.

**Step 5: build**

```bash
npm run build
```

Esperado: build concluído.

**Step 6: revisão manual rápida**

- Abrir o Studio, conferir no preview os anéis na base e no topo.
- Desligar as bordas e confirmar que o corpo volta ao cilindro reto.
- Verificar o painel: 17 sliders, faixa livre 99,2 mm e parede do topo 2,0 mm.
- Conferir o status bar: `74.6 × 111.2 × 2.4 mm`.
- Testar `handleHeight` 85 com `edgeRimWidth` 14: `can-handle-band` deve
  aparecer no painel sem impedir o build nem o export (validação é consultiva).
- Exportar e conferir que os dois STLs continuam fechados.

**Step 7: commit final (se houver ajuste)**

```bash
git add -A
git commit -m "fix: polish can holder edge rims"
```
