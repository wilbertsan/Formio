# Landing Page

## Visão geral

Porta de entrada do 3DFormio (`/`), em PT-BR, composta por:

1. **Navbar** — fixa, com logo, âncoras (Preços, FAQ) e CTA "Criar conta" (`/cadastro`)
2. **Hero** — headline, subtítulo, CTAs e visual SVG animado (sem WebGL)
3. **Preços** (`#precos`) — 3 planos (Grátis, Pro destacado, Business)
4. **FAQ** (`#faq`) — Accordion com 6 perguntas
5. **Footer** — marca, links de seção e rotas legais (`/termos`, `/privacidade`)

Rotas auxiliares: `/cadastro`, `/termos`, `/privacidade` e `*` usam
`PlaceholderPage` até o Sprint 1 implementar as páginas reais.

## Como editar

| O que | Onde |
|---|---|
| Planos e preços | `src/features/landing/config/plans.ts` |
| Perguntas do FAQ | `src/features/landing/config/faq.ts` |
| Cores/marca (tema Amplify UI) | `src/theme/index.ts` |
| Classes de botão (`.btn-primary`/`.btn-secondary`) | `src/index.css` |
| Visual do hero | `src/features/landing/components/HeroVisual.tsx` |

## Decisões

- **Hero estático (SVG + animação CSS):** zero WebGL na landing; um WebP real pode
  substituir o SVG dentro de `HeroVisual` sem tocar no restante.
- **CTAs como `Link` do react-router com classes Tailwind:** evita o polimorfismo
  `as` do Amplify UI e mantém navegação SPA, acessibilidade e tipagem.
- **Amplify UI para estrutura** (`View`, `Flex`, `Card`, `Accordion`, etc.),
  **Tailwind como utilitários**, conforme `docs/ui/` e o AGENTS.md.
- **Config tipada para planos/FAQ:** componentes são puramente visuais; mudança de
  conteúdo não toca em JSX.
- **Animação respeita `prefers-reduced-motion`.**

## Testes

`tests/features/landing/` cobre configs (planos/FAQ) e componentes
(Navbar, Hero, PricingSection, FaqSection, Footer, LandingPage).
Rodar: `npm run test`.
