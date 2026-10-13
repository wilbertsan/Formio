# Design: Carimbo com base única + texto em alto relevo

**Data:** 2026-10-12
**Status:** Aprovado e implementado
**Ferramenta:** Studio 3D > Confeitaria > Cortador + Carimbo

---

## 1. Visão geral

- **Cortador** passa a recortar o **contorno da palavra com margem** (silhueta única
  que une as letras), em vez da silhueta crua do texto.
- **Carimbo** passa a ter **base única** no mesmo contorno da palavra, com o **texto
  em alto relevo** na face de contato e cabo cilíndrico central.

## 2. Geometria

Com `T` = silhueta do texto (união das letras, com counters) e `M` = `baseMargin`:

- **Cortador**: abertura `expand(T, M)`; parede `expand(abertura, +wallThickness) − abertura`, extrudada `wallHeight`.
- **Base do carimbo**: `expand(T, M − CLEARANCE_MM)` (0.4mm/lado), unindo as letras;
  espessura `(stampHeight − reliefHeight) × (1 − HANDLE_HEIGHT_RATIO)`.
- **Relevo (alto relevo)**: `T` preenchido, extrudado `reliefHeight`, na face de
  contato (z = 0).
- **Cabo**: cilindro central, raio `HANDLE_RADIUS_RATIO` da altura do texto, altura
  `(stampHeight − reliefHeight) × HANDLE_HEIGHT_RATIO`.

Empilhamento (z): relevo `[0, R]` → base `[R, R + baseThickness]` → cabo até `stampHeight`
(`R = reliefHeight`).

## 3. Parâmetros novos

```
baseMargin: 2–10mm (padrão 4)
reliefHeight: 1–3mm (padrão 2)
```

## 4. Resultado

`{ cutter, stampBase, stampRelief, stampHandle }` (4 geometrias); preview e export
renderizam/mesclam as 4.

## 5. Decisões
- Cortador e base compartilham o contorno da palavra; a base encaixa com folga fixa.
- Relevo na face de contato (impressão face para baixo, padrão para carimbos).
- Reutiliza integralmente o helper `shared/textOutline.ts`.

## 6. Riscos
- Margem pequena em relação ao espaçamento das letras pode deixar a base com ilhas
  desconexas; o usuário aumenta a margem (até 10mm).
