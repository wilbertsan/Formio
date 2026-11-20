# Porta-lata 350 ml — Texturas importadas dos STLs (design)

**Data:** 2026-11-20
**Ferramenta:** `lembrancinhas/porta-lata`
**Status:** design aprovado; implementação pendente

## Desvios da implementação

- As profundidades medidas ficaram em **1,21–4,23 mm** (não 1–5); o maior é
  `pedra_hexagonal` (4,23 mm).
- A detecção da faixa por variação em θ foi substituída pelo **corte de pontas
  pela mediana do raio**; a faixa útil ficou em ~97–107 mm e o flange/lip/taper
  sai. O threshold é 0,8 mm (a variação de mediana no limite do padrão chega a
  0,78 mm; é apertado, mas estável nos 14).
- O filtro do furo usa `0,78 × maior raio da faixa final`; nos 14 o corte
  efetivo fica em 0,720–0,780 do raio máximo e os furos reais em 0,1–0,3.
- `can-texture-slope` foi **removido** do plano: todos os 14 medem >45°
  (49–74°), então o aviso por estilo virou uma nota única na seção Textura.
- `variationThresholdMm` não existe na implementação final.
- O exemplo `paralelepípedos` 3,6 mm do design estava superestimado; o valor
  real é 1,79 mm. `pedra_hexagonal` tem envelope 81,06 mm, offset do laço
  2,63 mm e abertura da mão ~22,1 mm.

## Objetivo

Usar os 14 rolos de textura em `files/` como estilos de textura do porta-lata.
O STL não entra no app: um script offline desenrola a superfície externa de cada
rolo em um mapa de altura, e o runtime aplica esse mapa como relevo positivo na
parede do corpo, preservando a profundidade nativa de cada textura.

## Escopo

Incluído:

- Conversão offline STL → mapa de altura normalizado (192 × 96) com metadados.
- 14 estilos importados, com nomes em português, somados aos 6 procedurais e
  `none`.
- Profundidade nativa por estilo (sem o clamp de escala dos procedurais);
  medida nos 14 arquivos: **1,21–4,23 mm**.
- Laço da alça deslocado pelo envelope da textura e abraçadeira engrossada para
  fora, preservando a sobreposição e o encaixe.
- Nota no painel: texturas importadas mantêm a profundidade do arquivo e
  podem exigir suporte (flancos medidos de 49–74°). Sem código de validação
  novo, porque os 14 estilos passam de 45° e o aviso não discriminaria.
- Painel com grupos Procedurais/Importadas e bloqueio dos sliders de
  profundidade/escala para importados.
- Testes, docs e script de regeneração.

Fora do escopo:

- Upload de STL/PNG em runtime.
- Textura nos anéis, base, borda, cavidade, furo, relevo do texto ou alça.
- Relevo entalhado.
- Preservar o STL original como malha; o app usa só o mapa de altura.
- Cor por textura.

## Arquivos de origem

Os 14 STLs em `files/` são rolos cilíndricos (eixo Z) de Ø34–59 mm e 66–115 mm de
altura, com o padrão no lado externo; o topo tem logo/flange e a parede interna
tem um furo. `files/` fica no `.gitignore` (≈400 MB) e não vai para o
repositório; só o asset gerado é commitado.

| Arquivo | Id | Nome no painel |
|---|---|---|
| 24tiles1inchgrid | `azulejos` | Azulejos 1" |
| Mosaic_Tile | `mosaico` | Mosaico |
| Small_Bricks | `tijolos_pequenos` | Tijolos pequenos |
| Small_broken_plaster | `reboco_pequeno` | Reboco quebrado pequeno |
| brick | `tijolos_rusticos` | Tijolos rústicos |
| broken_plaster | `reboco_quebrado` | Reboco quebrado |
| clean_bricks | `tijolos_limpos` | Tijolos limpos |
| cobble | `paralelepipedos` | Paralelepípedos |
| cobble_smooth_edges | `paralelepipedos_suaves` | Paralelepípedos suaves |
| diamond_plate | `placa_diamantada` | Placa diamantada |
| hex_stone | `pedra_hexagonal` | Pedra hexagonal |
| road | `asfalto` | Asfalto |
| scifi_hex | `hex_scifi` | Hex sci-fi |
| smallscifihex | `hex_scifi_pequeno` | Hex sci-fi pequeno |

Licença liberada pelo usuário; os nomes dos arquivos podem ser trocados pelos
rótulos acima.

## Conversão offline

`scripts/texture-import.mjs` (Node, sem dependência nova):

1. Lê STL binário (84 bytes + 50 por triângulo), calcula bounds e centro X/Y.
2. Confirma que o eixo longo é Z; corta as pontas detectando as linhas em que a
   variação radial é ~0 (flange/logo). O logo fica na face interna e não entra.
3. Desenrola a superfície externa: grade fixa de **192 colunas (θ) × 96 linhas
   (v)**; para cada triângulo, rasteriza em (θ, z) e guarda o **maior raio** por
   célula. Células vazias são preenchidas pela média dos vizinhos; a parede do
   furo nunca vence porque o raio máximo é a casca externa.
4. Normaliza `(r − rBase) / (rTop − rBase)` em `0..1`, quantiza em 8 bits.
   `rBase`/`rTop` são os percentis 1/99 do mapa preenchido.
5. Mede a **profundidade nativa** `rTop − rBase` (mm) e a **inclinação máxima**
   do mapa já mapeada para a parede nominal (99,2 mm): `depth × |Δv| / (99,2/95)`,
   em graus. A faixa do padrão é o intervalo entre as pontas, cortando flange/
   lip/taper enquanto a mediana do raio da linha se afasta mais de 0,8 mm da
   mediana interior (os 14 arquivos resultam em ~97–107 mm de faixa útil).
6. Gera dois módulos:
   - `importedTextures.ts` — metadados (id, nome, profundidade, inclinação,
     dimensões), importado pelo schema/painel;
   - `importedTextureData.ts` — mapas em base64, importado só por `texture.ts`
     (worker), ~350 KB.
7. `--check` regenera em memória e compara com os arquivos commitados (local,
   porque os STLs não ficam no repositório).

O mapeamento usa `u = θ/2π` (volta completa, sem emenda) e
`v = (y − paredeMin) / (paredeMax − paredeMin)`. O padrão é redimensionado para
a parede entre os anéis (~99 mm no default), então a distorção horizontal é
~1,5–2,1× e a vertical depende do rolo; o relevo radial é preservado.

## Parâmetros e derivados

- `textureStyle` ganha os 14 ids importados. Os 6 procedurais e `none`
  continuam.
- `textureDepth` e `textureScale` continuam valendo só para os procedurais.
- `getTextureEnvelope(params)`:
  - `none` → 0;
  - procedural → `min(textureDepth, textureScale / 4)`;
  - importado → `nativeDepth`.
- `getMaxOuterDiameter = getOuterDiameter + 2 × envelope`.
  Ex.: `paralelepipedos` 3,6 mm → 72,6 + 7,2 = **79,8 mm**.
- `getEffectiveTextureDepth` mantém o comportamento procedural; para importado
  devolve `nativeDepth` (o slider é ignorado).

## Geometria da alça

Com textura profunda o laço colidiria com o relevo. O deslocamento é mínimo:

```text
envelope = getTextureEnvelope(params)
offset   = max(0, envelope − (handleClearance + HANDLE_LOOP_INSET − 0.7))
```

- Procedurais: envelope ≤ 1,5 → offset 0; a alça atual não muda.
- `paralelepipedos` (3,6 mm): offset ≈ 2,0 mm; o laço fica a 0,7 mm do pico.
- `getLoopLeftX` soma o offset.
- `getHandleMetrics.outerRadius` e `getBandOuterRadius` somam o offset; o anel
  engrossa **para fora** e o laço continua sobreposto à abraçadeira (≈1,5 mm).
- O raio interno da abraçadeira e o encaixe por pressão não mudam.
- O laço não corta a textura; a abertura da mão diminui pelo offset e
  `can-handle-reach` avisa abaixo de 16 mm.
- A faixa lisa da abraçadeira continua; para importados o fade da máscara é
  limitado a 4 mm em vez de `3 × profundidade`, para não abrir um colar liso
  enorme. O ombro pode passar de 45° e é coberto pelo aviso.

## Texto e relevo

- O envelope importado entra na extrusão do texto: `1 mm + 0,2 mm + envelope`;
  a base continua em `outerR − 0,2` e a frente `1 mm` acima do pico.
- O texto pode ficar 4–5 mm acima da parede; a faixa e o auto-fit não mudam.

## Validação

- `can-texture` (warning) continua só para procedurais (profundidade limitada
  pela escala).
- **Nenhum código novo**: os 14 importados medem 49–74° e um aviso por estilo
  não discriminaria; a nota fica no painel. `maxSlopeDeg` permanece na metadata
  e é mostrado na seção Textura.
- `can-handle-reach` considera a abertura reduzida pelo offset.
- `can-handle-band`, `can-text-band` e `can-edge-rim` inalterados.

## UI

- `SelectField` "Estilo da textura" com dois `optgroup`: **Procedurais**
  (Nenhuma, Madeira, Metal, Escamas, Onduladas, Pedra, Pontiagudo) e
  **Importadas** (14).
- Estilo importado: "Profundidade da textura" e "Escala da textura"
  desabilitados; nota "Textura importada: profundidade X mm · flancos ~Y°.
  Pode exigir suporte." e o nome do padrão.
- Estilo procedural: comportamento atual (dica de estilo, profundidade
  efetiva etc.).
- Continuam 7 seções e 19 sliders.
- Status bar e "Diâmetro externo" usam o envelope importado.

## Arquitetura de arquivos

```text
src/features/studio/tools/lembrancinhas/porta-lata/
  importedTextures.ts        # metadados gerados (ids, nomes, profundidade, inclinação)
  importedTextureData.ts     # mapas 192×96 em base64 (gerados)
  texture.ts                 # amostragem procedural + importada
  schema.ts                  # enum, envelopes, loop offset
  shapes.ts                  # laço/abraçadeira com offset
  validateCanHolder.ts       # can-texture-slope
  StudioPanel.tsx            # grupos e estados importados
scripts/
  texture-import.mjs         # conversão e --check
```

## Pipeline

```text
files/*.stl (fora do repo)
  → scripts/texture-import.mjs
  → importedTextures.ts + importedTextureData.ts
  → schema (enum/envelopes/offset)
  → textureDisplacement (amostragem u/v + máscara)
  → buildBody (parede deslocada)
  → buildRelief (texto elevado)
  → buildHandle (laço/banda com offset)
  → worker / preview / export
```

## Testes

- Metadados: 14 estilos, ids/nomes únicos, profundidade 1–5 mm, inclinação
  coerente, mapas 192 × 96.
- Amostragem importada: bilinear, `u` periódico, `v` clampado, faixa
  `0..nativeDepth`, mapa não uniforme.
- `buildBody`: cada importado fechado/single-shell; raio máximo =
  `outerR + nativeDepth`; faixa da abraçadeira lisa.
- `buildHandle`: offset do laço e engrossamento do anel; sobreposição
  preservada; procedurais sem offset; abertura da mão > 0.
- `buildCanHolder`: manifold com texto + importado; volume; custo.
- Validação: `can-texture-slope` e `can-handle-reach`; procedurais sem
  `can-texture-slope`.
- Hook/painel: 21 opções em dois grupos, sliders desabilitados, notas,
  diâmetro externo com envelope importado.
- Script: unwrap de um cilindro sintético; `--check` local.

## Performance

- Mapas: 14 × 192 × 96 = 258 KB crus → ~350 KB base64, no chunk do worker.
- Amostragem bilinear por vértice (~25k) é barata; o build continua dominado
  pelo CSG (~1 s no default texturado).
- O encode base64 é decodificado uma vez por build/worker.

## Riscos e mitigação

- **Overhangs de 1,2–4,2 mm**: nota no painel; a impressão pode exigir suporte.
  Build e STL continuam válidos.
- **Distorção u/v**: é o preço de fechar 360° sem emenda; documentada.
- **Laço mais afastado**: abertura da mão menor; `can-handle-reach` avisa.
- **Asset desatualizado**: `--check` e teste dos metadados.
- **Texturas parecidas**: 14 opções no select; os nomes deixam claro.
- **Mapas com furo/flange**: o raster usa o maior raio e corta as pontas; teste
  de mapa não uniforme e profundidade mede o resultado.

## Critérios de conclusão

- Os 14 estilos aparecem no painel em "Importadas" e geram corpo fechado,
  single-shell, com raio máximo `outerR + profundidade nativa`.
- O laço fica ≥ 0,7 mm do pico e continua sobreposto à abraçadeira; estilos
  procedurais mantêm a alça atual.
- Texto 1 mm acima do envelope; anéis, base, borda, cavidade e furo intactos.
- `can-texture-slope` avisa nos estilos > 45°; nada bloqueia build/export.
- Painel com 19 sliders e sliders de profundidade/escala desabilitados nos
  importados.
- Suíte, typecheck, lint e build passando.
- `files/` fora do versionamento; assets gerados commitados; docs atualizadas.
