# Ferramenta: Cortador + Carimbo

## Status

Implementada.

## Objetivo

Combinar cortador de contorno com carimbo central — uma única peça que corta e estampa.

## Parâmetros

- Formato externo: circular, retangular, estrela
- Diâmetro (círculo/estrela): 30–80mm
- Largura/altura (retângulo): 30–80mm cada
- Altura da parede: 15–40mm
- Espessura da parede: 0.8–2mm
- Altura do carimbo: 5–20mm (sempre menor que a parede)
- Texto central: até 30 caracteres, estilo normal/bold/serif, 5–15mm
- Forma central: círculo, estrela ou coração (opcional)
- Escala da forma: 0.5–2.0x
- Cores de preview: base e carimbo (10 cores PLA)

## Regras do domínio

- Contorno afiado para corte, relevo central para marcação
- Altura diferenciada: parede de corte mais alta que o carimbo
- Espaçamento mínimo entre parede e carimbo: 3mm
- Duas operações em uma peça: eficiência de impressão
- Texto e forma combináveis no centro

## Estrutura de arquivos

```
src/features/studio/tools/confeitaria/cortador-carimbo/
├── AGENTS.md
├── schema.ts              # Schema Zod e tipos
├── buildCutterStamp.ts    # Função de build (geometria)
├── useCutterStamp.ts      # Hook de estado
├── StudioPanel.tsx        # Painel de parâmetros
├── CutterStampPreview.tsx # Preview R3F
└── exportStl.ts           # Exportação STL
```

## Fora de escopo

Chaveiros, letreiros, backend.
