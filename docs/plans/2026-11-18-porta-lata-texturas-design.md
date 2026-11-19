# Porta-lata 350 ml — Texturas do corpo (design)

**Data:** 2026-11-18
**Ferramenta:** `lembrancinhas/porta-lata`
**Status:** design aprovado; implementação pendente

## Objetivo

Adicionar texturas decorativas ao corpo do porta-lata: madeira, metal,
escamas, onduladas, pedra e pontiagudo, em relevo geométrico positivo impresso
no STL. A textura cobre a parede cilíndrica entre os anéis, deixa uma faixa lisa
na altura da abraçadeira da alça e mantém o nome em relevo 1 mm acima do pico da
textura. O corpo continua um sólido fechado, impresso em pé sem suporte.

## Escopo

Incluído:

- Seis estilos de textura procedural (`wood`, `metal`, `scales`, `waves`,
  `stone`, `spikes`) + `none`.
- Campo de altura determinístico e periódico em θ.
- Parede subdividida e deslocada radialmente sobre o `LatheGeometry`.
- Máscara de borda (fade de 2 mm) e faixa lisa da abraçadeira.
- Texto elevado pelo envelope da textura.
- Painel com seção **Textura**.
- Testes de geometria, relevo, hook e painel.

Fora do escopo:

- Textura nos anéis, na base, na borda, na cavidade ou no furo.
- Relevo entalhado (negativo).
- Textura no relevo do texto.
- Textura no preview por material/bump; o STL carrega a geometria.
- Texturas por SVG ou envio de imagem.
- Relevo na alça.

## Parâmetros

| Parâmetro | Faixa | Default |
|---|---|---|
| `textureStyle` | `none`, `wood`, `metal`, `scales`, `waves`, `stone`, `spikes` | `none` |
| `textureDepth` | 0,4–1,5 mm | 0,8 |
| `textureScale` | 4–16 mm | 8 |

- `textureStyle === 'none'` devolve o corpo atual sem custo de detalhe.
- `getTextureEnvelope(params)` = 0 com `none`, senão `textureDepth`.
- `getMaxOuterDiameter` passa a usar
  `outerR + max(salto do anel, envelope da textura)`. Com textura `none`, o
  valor atual (74,6 mm) não muda; com profundidade 1,5 mm vira 75,6 mm.

Constantes:

| Constante | Valor |
|---|---|
| `TEXTURE_RADIAL_SEGMENTS` | 256 |
| `TEXTURE_STEP_MM` | 1,0 |
| `TEXTURE_EDGE_FADE_MM` | 2,0 |
| `TEXTURE_HANDLE_GAP_MM` | 1,0 |
| `TEXTURE_HANDLE_FADE_MM` | 2,0 |

`HOLDER_SEGMENTS` (128) continua valendo com textura desligada.

## Estilos

Todos recebem `θ` em radianos e `y` em mm, retornam `0..depth` e são periódicos
em θ. Nenhum usa `Math.random`: o hash é inteiro por célula e a contagem de
células em θ é inteira (`round(circunferência / escala)`), então a emenda em
θ = 0/2π fecha.

- **wood** — veios verticais sinuosos: seno em `u = θ/2π` com
  `grain = max(6, round(circunferência / escala))` veios, deformado por um seno
  lento em `y`. Metade do período vira vale.
- **metal** — knurled: duas famílias de sulcos diagonais cruzados, com
  `n = round(circunferência / escala)` células por volta; soma normalizada de
  dois senos cruzados em `u·n ± y/escala`.
- **scales** — escamas sobrepostas: fileiras de calotas com passo vertical
  `0,75 × escala` e fileiras alternadas; avalia a fileira atual e a anterior e
  usa o maior valor, criando a sobreposição.
- **waves** — ondas horizontais: seno em `y/escala` modulado por um seno em θ
  com contagem inteira de células; as cristas ondulam ao redor do corpo.
- **stone** — superfície rochosa: ruído de valor de duas oitavas sobre uma grade
  periódica em θ, com interpolação suave (smoothstep). A interpolação substitui
  o bisel original de 0,8 mm para manter os flancos imprimíveis.
- **spikes** — pirâmides alternadas: grade escalonada, meia-base
  `max(textureDepth, 0,3 × escala)` para os flancos ficarem ≤ 45° mesmo com
  profundidade máxima.

## Geometria

```text
bodyProfile (inalterado)
  → subdivisão da parede externa em passos de 1 mm
  → LatheGeometry com 256 segmentos (somente com textura)
  → deslocamento radial da parede: r = outerR + h(θ, y) × máscara(y)
  → computeVertexNormals
  → removeDegenerateTriangles
  → buildRelief elevado + CSG
```

- A subdivisão só insere pontos no segmento cujos dois extremos têm raio
  `outerR`: entre os anéis (`width` a `height − width`) ou da base à borda
  quando os anéis estão desligados. `bodyProfile` não muda, então os testes de
  perfil continuam iguais.
- Só vértices com raio ≈ `outerR` são deslocados. Anéis, base, borda, cavidade e
  furo ficam intactos.
- Máscara = fade de borda × faixa da alça:
  - fade de 2 mm a partir de cada extremidade da parede;
  - com a alça ligada, zero dentro de
    `[handleHeight − handleWidth/2 − 1, handleHeight + handleWidth/2 + 1]` e
    transição suave de 2 mm para fora.
- Como só posições mudam, a topologia é preservada e a malha continua fechada.
  A periodicidade em θ garante a mesma altura nas duas cópias da emenda.
- Relevo apenas positivo: a parede nominal é a mínima; picos somam até
  `textureDepth`.
- Impressão em pé sem suporte: veios/ondas/escamas/ruído têm flancos suaves;
  as pirâmides crescem a meia-base com a profundidade para manter ~45°.

## Texto sobre a textura

- `buildRelief` extruda `CONTENT_DEPTH + RELIEF_EMBED + envelope` e curva o texto
  no raio `outerR + envelope`.
- A base do glifo continua em `outerR − 0,2 mm`, sempre dentro do corpo, mesmo
  nos vales; o topo fica `1 mm` acima do pico da textura.
- O auto-fit, a faixa do texto (`getTextBand`) e o `clampCenterY` não mudam.

## Alça

- A faixa lisa preserva o raio nominal na região da abraçadeira, então
  `getBandInnerRadius`, a folga e a interferência continuam valendo sem
  alteração.
- O laço em D fica a `outerR + handleClearance + 2 mm` da parede; com profundidade
  máxima de 1,5 mm, a folga mínima continua ≥ 0,7 mm.
- A alça não recebe textura.

## Derivados

- Com textura `none`: diâmetro externo 74,6 mm, parede do topo 2,0 mm, faixa do
  texto 8,0–103,2 mm, tudo como hoje.
- Com `textureDepth` 1,5 mm e anéis de 1,0 mm: diâmetro externo 75,6 mm.
- O status bar e o `fallbackFitRadius` usam `getMaxOuterDiameter`.

## Validação

Nenhum código novo. A textura é limitada pelo schema, só adiciona material e não
muda a alça nem o texto:

- `can-handle-band`: continua exigindo a banda entre os anéis; a faixa lisa
  acompanha a altura escolhida.
- `can-text-band`: faixa inalterada; o texto é elevado, não aproximado da borda.
- `can-edge-rim`: inalterado.
- Validação segue consultiva (não bloqueia build/export).

## UI

Acordeão **Textura** entre "Bordas" e "Alça":

- `SelectField` "Estilo" com Nenhuma, Madeira, Metal, Escamas, Onduladas, Pedra
  e Pontiagudo.
- "Profundidade da textura" (0,4–1,5 mm, passo 0,1) e "Escala da textura"
  (4–16 mm, passo 1), desabilitados com estilo "Nenhuma".
- Nota "Relevo positivo. A faixa da alça fica lisa e o nome fica 1 mm acima da
  textura." e, com estilo nenhum, "Escolha um estilo para ajustar os
  parâmetros.".
- 19 sliders no total (17 atuais + 2). Componentes existentes, sem criar
  componente novo.

## Arquitetura de arquivos

```text
src/features/studio/tools/lembrancinhas/porta-lata/
  texture.ts          # novo: estilos, campo de altura, máscaras
  buildBody.ts        # subdivisão da parede + lathe + deslocamento
  buildRelief.ts      # texto elevado pelo envelope
  schema.ts           # enum, parâmetros, constantes, derivados
  StudioPanel.tsx     # seção Textura
  useCanHolder.ts     # ranges + params do build
tests/features/studio/tools/lembrancinhas/porta-lata/
  texture.test.ts     # novo
```

## Pipeline

```text
Parâmetros
  → schema (textureStyle/Depth/Scale)
  → perfil do corpo (anéis)
  → subdivisão da parede + LatheGeometry (256)
  → deslocamento com textura + máscaras
  → buildRelief elevado
  → CSG union(texto, corpo)
  → buildHandle (inalterado)
  → worker / preview / export dos dois STLs
```

## Exportação

- Sem mudança: dois STLs, corpo e alça, sem cor.
- A textura faz parte do corpo; não há peça solta.
- Corpo em pé, base no anel inferior; textura só em relevo positivo.

## Riscos e mitigação

- **Custo de malha e CSG**: parede com ~25k quads. Medir o build por estilo; se
  o default texturado passar de ~2,5 s de CPU, reduzir para 192 segmentos ou
  passo de 1,2 mm. Gate de teste com folga (não relógio de parede).
- **Aliasing em pedra/pontiagudo**: escala mínima de 4 mm, passo de 1 mm e
  interpolação suave na pedra; revisar no preview.
- **Emenda em θ**: contagem inteira de células e funções periódicas; teste
  compara alturas em 0 e 2π.
- **Texto flutuando sobre vales**: base do glifo permanece em `outerR − 0,2`;
  teste de volume/uniformidade no build completo.
- **Encaixe da alça**: máscara lisa na faixa; teste garante vértices da faixa em
  `outerR`.
- **Tempo de impressão**: relevo positivo adiciona superfície, não volume;
  profundidade máxima 1,5 mm.

## Critérios de conclusão

- Os seis estilos geram corpo fechado, single-shell, manifold, com bbox
  `outerR + textureDepth` e anéis intactos.
- Faixa da abraçadeira permanece em `outerR`; a alça encaixa como hoje.
- Texto fica 1 mm acima do envelope e continua unido ao corpo.
- Textura desligada reproduz exatamente o corpo atual (bbox, perfil, testes).
- Painel com seção Textura e 19 sliders; status bar com diâmetro máximo.
- Suíte completa, typecheck, lint e build passando.
- `AGENTS.md` da ferramenta e da categoria e `docs/frontend/studio.md`
  atualizados.
