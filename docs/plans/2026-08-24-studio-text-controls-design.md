# Design — Bloco Texto do Studio com Controles Completos

Data: 2026-08-24
Status: Aprovado
Escopo: Frontend — dropdown de estilo, sliders de largura/altura do texto e relevo na aba Texto, sem tocar nas dimensões da peça

## Contexto

No bloco Texto do StudioPanel, o ButtonGroup de estilo de letra (3 botões)
transborda a largura do painel (w-64) — itens ficam fora da área de interação.
Além disso, os sliders do bloco controlavam dimensões erradas: "Largura"
mexia na peça e "Altura da letra" era o relevo. Não havia controle do tamanho
visual do texto (apenas auto-fit).

## Mudanças

### Schema (2 campos novos)

| Param | Range | Default |
|---|---|---|
| `textWidth` | 8–60 mm | 40 |
| `textSize` | 4–20 mm | 10 |

`letterHeight` (relevo Z) permanece. Defaults coerentes com a largura padrão
da peça (50 − 2×4 = 42mm de área útil).

### Build (buildKeychain)

- Gera o texto com `size = textSize` e escala uniforme
  `scale = min(textWidth / larguraNatural, 1)` — o texto nunca excede a
  área útil (`width − 2 × borderWidth`), preservando a regra de 4mm.
- `fitTextHeight` deixa de ser o único limitador: `textSize`/`textWidth` são
  a referência; o clamp de segurança continua.

### UI (StudioPanel)

**Bloco Texto:**
1. TextField Nome (mantém)
2. `SelectField` "Estilo da letra" (Negrito/Normal/Serifada) — substitui o
   ButtonGroup que estourava
3. Sliders: Largura do texto (8–60), Altura do texto (4–20), Altura do
   relevo (0.4–2)

**Bloco Base:** ganha o slider Largura da peça (20–80, antes perdido no
bloco Texto); mantém forma, cores, espessura e borda.

**Bloco Relevo:** apenas o modo Relevo/Gravado (o slider duplicado sai).

### Testes

- schema: novos ranges e defaults; rejeita textWidth/textSize fora do range
- buildKeychain: textWidth clampa à área útil; textSize define a altura das
  letras; relevo inalterado
- StudioPanel: SelectField com 3 opções; 3 sliders no Texto; Largura na
  Base; sem ButtonGroup de estilo

## Fora de escopo

Escala não-uniforme (esticar), rotação do texto, múltiplas linhas.

## Definition of Done

- lint/typecheck/test/build verdes
- Dropdown de estilo funcional dentro do painel (sem overflow)
- 3 sliders do texto alteram apenas o texto
- Largura da peça na aba Base
- Docs atualizadas
