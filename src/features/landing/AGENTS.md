# Landing Page

## Escopo

Página pública de apresentação do 3DFormio em `/`.

## Componentes

- `Navbar.tsx` — navegação sticky com links para Preços, FAQ, Studio 3D, Criar conta
- `Hero.tsx` — headline + CTA (Começar grátis / Ver preços / Abrir o Studio)
- `HeroVisual.tsx` — SVG animado com visual isométrico
- `PricingSection.tsx` — 3 planos (Grátis, Pro, Business) lidos de `config/plans.ts`
- `FaqSection.tsx` — accordion de perguntas lido de `config/faq.ts`
- `Footer.tsx` — links úteis + copyright

## Config

- `config/plans.ts` — array de planos com preço, features, CTA
- `config/faq.ts` — array de perguntas e respostas

## Stack

React 19, React Router, Amplify UI (Heading, Text, View, Card, Accordion, Badge), TailwindCSS

## Decisões visuais

- Tema teal (`teal-600` primary), neutral-900 text
- Classes utilitárias `.btn-primary` e `.btn-secondary` definidas em `src/index.css`
- Max width 1120px, responsivo via `direction={{ base: 'column', large: 'row' }}`

## Testes

`tests/features/landing/` — cobre componentes, config, renderização da página.

## Fora de escopo

Autenticação, dashboard, studio, ferramentas de geração.
