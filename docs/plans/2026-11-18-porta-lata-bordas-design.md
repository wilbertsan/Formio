# Porta-lata 350 ml — Bordas decorativas (design)

**Data:** 2026-11-18
**Ferramenta:** `lembrancinhas/porta-lata`
**Status:** design aprovado; implementado

## Objetivo

Adicionar duas bordas decorativas ao corpo do porta-lata: anéis salientes de
revolução, um colado na base e outro colado no topo, compartilhando os mesmos
parâmetros. O corpo continua um sólido de revolução fechado, impresso em pé sem
suporte; alça, texto, validação e export continuam com as mesmas regras.

## Escopo

Incluído:

- Dois anéis de perfil trapezoidal com flancos a 45°.
- Um conjunto de parâmetros compartilhado (`edgeRimEnabled`,
  `edgeRimProtrusion`, `edgeRimWidth`).
- Clamp da protrusão para sobrar face plana.
- Atualização da faixa disponível para a alça e para o texto.
- Painel com a aba **Bordas**, diâmetro externo máximo e parede do topo real.

Fora do escopo:

- Anéis independentes (posição/salto por anel).
- Perfil arredondado ou retangular.
- Recorte do anel onde passa a alça.
- Peça separada, cor por anel ou textura.

## Parâmetros

| Parâmetro | Faixa | Default |
|---|---|---|
| `edgeRimEnabled` | booleano | `true` |
| `edgeRimProtrusion` | 0,4–1,5 mm | 1,0 |
| `edgeRimWidth` | 4–14 mm | 6 |

- `edgeRimWidth` é a largura total do anel no corpo.
- `getEffectiveRingProtrusion` clampa em `(width − 1) / 2`, no mesmo padrão de
  `getEffectiveLeadIn`/`getEffectiveRimChamfer`. `MIN_RING_FLAT_MM = 1`.
- `edgeRimEnabled` falso devolve o perfil atual sem nenhum ponto novo.
- `p ≤ 1,5 mm` mantém o laço da alça com folga ≥ 0,7 mm do anel na folga mínima
  da alça (`handleClearance` 0,2 + `HANDLE_LOOP_INSET` 2 − 1,5), então o laço
  nunca colide com o anel.

### Nomes

`rimLeadIn`/`rimChamfer` já são a borda de entrada do corpo. Os novos campos são
`edgeRim*` para não ambiguar. `handleBand` continua sendo a largura da banda da
abraçadeira.

## Geometria

Perfil fechado em `(r, y)` com anéis ligados:

```text
(ventR, 0)
→ (outerR + p - base, 0)
→ (outerR + p, base)
→ (outerR + p, w - p)
→ (outerR, w)
→ (outerR, height - w)
→ (outerR + p, height - w + p)
→ (outerR + p - chamfer, height)
→ (innerR + leadIn, height)
→ (innerR, height - leadIn)
→ (innerR, bottomThickness)
→ (ventR, bottomThickness)
→ (ventR, 0)
```

- `p` = protrusão efetiva, `w` = largura, `base` = `BASE_CHAMFER_MM` limitado a
  20% do raio externo, `chamfer`/`leadIn` = valores efetivos atuais.
- Com `w ≥ 2p + 1` (schema) e `base ≤ 0,4 mm`, a face vertical do anel é sempre
  positiva; o `dedupePoints` ainda cobre o caso `rimChamfer = 0`.
- O anel inferior apoia na mesa com a face em `y = 0`; o chanfro da base mantém
  a aresta viva fora do contato.
- O anel superior tem a face inferior a 45°, imprimível sem suporte; o
  `rimChamfer` atual continua no topo.
- O perfil só usa retas, então o `LatheGeometry` de 128 segmentos continua
  exato e o corpo segue single-shell com o furo passante.
- `getTopLand` soma `p` quando os anéis estão ligados, expondo a parede real do
  topo no painel.
- `getMaxOuterDiameter = getOuterDiameter + 2p` alimenta o diâmetro externo do
  painel, o status bar e o `fallbackFitRadius`. `getOuterRadius` continua o raio
  da parede, usado por alça, laço e relevo.

## Validação

| Código | Severidade | Regra |
|---|---|---|
| `can-edge-rim` | error | `2 × edgeRimProtrusion + 1 > edgeRimWidth` (valores crus) |
| `can-edge-rim` | error | defensiva: `2 × edgeRimWidth + 4 > altura` |
| `can-handle-band` | error | com anéis ligados, a banda da abraçadeira precisa ficar entre `w + 2` e `altura − w − 2` |
| `can-text-band` | error | com anéis ligados, a faixa do texto usa `max(bottomThickness, w) + 2` e `altura − max(chamfer, w) − 2` |

- `can-rim` não muda: a parede mínima do topo continua sendo validada pela
  regra crua da parede base; o anel apenas engorda o topo.
- `can-handle-band` mantém o mesmo código e mensagem; só a faixa disponível
  muda. O laço continua podendo passar da borda superior.
- Avisos não bloqueiam build nem export.

## UI

- Acordeão **Bordas** entre "Corpo" e "Alça": switch, `Salto das bordas`
  (0,4–1,5 mm, passo 0,1), `Largura das bordas` (4–14 mm, passo 1), dica
  "Ligue as bordas para ajustar os parâmetros." quando desligado e a linha
  "Texto entre X e Y mm", usando `getTextBand` (faixa útil real, com a margem de
  2 mm), em vez da faixa geométrica `altura − 2w`.
- Componentes existentes: `SwitchField`, `SliderField` via `LabeledSlider`,
  `Text`.
- "Diâmetro externo" usa `getMaxOuterDiameter`; "Parede do topo" usa
  `getTopLand` atualizado.
- Status bar usa o diâmetro máximo.

## Impacto

- O corpo default passa de Ø72,6 para Ø74,6 mm na base e no topo, e a parede do
  topo de 1,0 para 2,0 mm. A altura externa, a cavidade e o furo não mudam.
- Texto default (`Festa`, 10 mm, centro 60 mm) continua dentro da faixa
  `[8, 103,2]` mm.
- Alça default (banda 54–66 mm) continua dentro da faixa `[8, 103,2]` mm.
- Export continua com dois STLs, sem cor e sem peça solta.

## Testes

- `schema.test`: defaults, faixas, clamp, `getTopLand`, `getMaxOuterDiameter`.
- `buildBody.test`: bbox, pontos dos anéis, on/off, extremos, manifold.
- `validateCanHolder.test`: `can-edge-rim`, banda entre anéis, faixa do texto,
  casos desligados.
- `StudioPanel.test`: seção nova, 17 sliders, ranges, estado desabilitado.
- `useCanHolder.test`: ranges, params do build, diâmetro máximo.
- `buildCanHolder.test`: bbox com anéis.

## Desvios da implementação

- A constante da face plana foi implementada como `MIN_EDGE_RIM_FLAT_MM`; o
  design a chamava `MIN_RING_FLAT_MM`.
- O perfil implementado inclui o ponto vertical `(ringR, height - chamfer)`
  entre o flanco superior e o chanfro da borda. O design o omitia; sem ele o
  anel superior perde a face vertical e o `getTopLand` não fecha.
- `getMaxOuterDiameter` não inclui o relevo de 1 mm do texto: é o diâmetro do
  corpo com os anéis, coerente com as medidas nominais do painel e do status
  bar.
- O clamp de `getEffectiveRingProtrusion` e a validação `can-edge-rim` são
  defensivos: inalcançáveis pelo schema e pela UI.
- A linha do painel usa `getTextBand` e mostra `Texto entre X e Y mm` (faixa
  útil real, com 2 mm de margem), em vez da faixa geométrica `altura - 2w`.
- `getRingWallBand` é a fonte única da extensão dos anéis: `getTextBand` parte
  dela e `can-handle-band` usa a mesma faixa. O build (`clampCenterY`) e a
  validação do texto também compartilham `getTextBand`, evitando regras
  duplicadas no design.

## Documentação

`porta-lata/AGENTS.md`, `lembrancinhas/AGENTS.md` e, se listar os parâmetros do
porta-lata, `docs/frontend/studio.md`.
