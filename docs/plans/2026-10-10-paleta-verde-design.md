# Paleta verde (10% mais escura) — Design

Data: 2026-10-10

## Objetivo

Trocar a paleta de destaque do site (antes teal) para verde, tendo `#227A0C`
como cor primária inicial. Posteriormente a paleta foi escurecida em 10%,
resultando em `brand-600 = #1F6E0B`.

## Decisões

- Criada a escala `brand` com tons `50,100,200,300,400,500,600,700,800,900`
  derivados em HSL (hue 108).
- Versão final (10% mais escura): `brand-600 = #1F6E0B`, obtida reduzindo a
  luminosidade HSL de cada tom em 10% relativo, mantendo hue/saturação.
- `src/index.css`: escala exposta via `@theme` (Tailwind 4) para gerar utilitários
  `brand-*`; `.btn-primary` usa `brand-600/700`.
- `src/theme/index.ts`: tokens Amplify `colors.brand` (hex) e `primary` mapeado
  para `{colors.brand.*}` (10→50, 20→100, 40→300, 60→500, 80→700, 90→800,
  100→900). A resolução de referência a token customizado foi verificada.
- Classes `teal-*` substituídas por `brand-*` em `Hero.tsx`, `PricingSection.tsx`,
  `ToolSelector.tsx` e `StudioTopbar.tsx`.
- Neutros e as cores padrão dos modelos 3D (`#14b8a6`, dado do produto) não foram
  alterados.
- Vídeo do Hero aumentado em 20%: `max-w-md` (28rem) → `max-w-[33.6rem]`.

## Fora de escopo

- Alterar cores padrão dos modelos 3D.
- Suporte a dark mode das classes utilitárias Tailwind.
