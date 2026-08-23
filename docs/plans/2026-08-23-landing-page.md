# Landing Page 3DFormio — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir a landing page do 3DFormio (hero estático, preços, FAQ, footer) com app Vite + React 19 + TS strict + Tailwind v4 + Amplify UI, e inicializar o backend Amplify Gen2 com Cognito.

**Architecture:** SPA única com roteamento client-side (`/` landing, `/cadastro` e rotas legais como placeholders). Feature First: tudo da landing em `src/features/landing/` (components + config). Tema Amplify UI custom em `src/theme/`, Tailwind como camada de utilitários (classes `.btn-*` DRY). Dados de planos/FAQ em arquivos de config tipados — sem lógica em componentes.

**Tech Stack:** Vite 6, React 19, TypeScript 5.8 (strict), TailwindCSS 4, @aws-amplify/ui-react 6, react-router-dom 7, Vitest 3 + Testing Library, Amplify Gen2 (@aws-amplify/backend).

**Design doc:** `docs/plans/2026-08-23-landing-page-design.md`

---

## Convenções para o executor

- **TDD obrigatório:** @superpowers:test-driven-development — escreva o teste, veja falhar, implemente, veja passar, commite. Nunca escreva implementação antes do teste (exceto Tasks 1, 13, 14, 15 que são infraestrutura).
- **Commits semânticos** após cada task: `feat:`, `chore:`, `test:`, `ci:`, `docs:`.
- **Nunca** use `any`, `print()`-equivalentes, TODO, código morto.
- **Comandos de verificação:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- **Contexto do repo:** raiz `/opt/projects/BELIS3D` já contém `AGENTS.md`, `docs/`, `.git` (branch `main`). NÃO usar `npm create vite` (o diretório não está vazio e o scaffolder é interativo) — os arquivos são criados manualmente abaixo.
- **Decisão de UI:** CTAs de navegação usam `Link`/`NavLink` do react-router estilizados com as classes `.btn-primary`/`.btn-secondary` (Tailwind). Componentes estruturais usam Amplify UI (`View`, `Flex`, `Heading`, `Text`, `Card`, `Badge`, `Accordion`). Isso evita o polimorfismo `as` do Amplify UI (instável em TS) mantendo os CTAs acessíveis e tipados.
- **Imagem do hero:** SVG inline (código, leve, sem binário). Um WebP real pode substituir depois dentro do mesmo componente `HeroVisual`.

---

### Task 1: Scaffold do app Vite + React 19 + TS strict + Tailwind 4 + ESLint

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `public/favicon.svg`, `src/main.tsx`, `src/index.css`, `src/app/App.tsx`, `src/vite-env.d.ts`, `eslint.config.js`, `.gitignore`

**Step 1: Criar `package.json`**

```json
{
  "name": "3dformio",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc -b",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@aws-amplify/ui-react": "^6.11.2",
    "aws-amplify": "^6.15.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.28.0",
    "@tailwindcss/vite": "^4.1.11",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^22.15.21",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vitejs/plugin-react": "^4.5.2",
    "eslint": "^9.28.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.2.0",
    "jsdom": "^26.1.0",
    "tailwindcss": "^4.1.11",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.34.0",
    "vite": "^6.3.5",
    "vitest": "^3.2.4"
  }
}
```

**Step 2: Criar `vite.config.ts`** (plugins React + Tailwind, alias `@`, config do Vitest)

```ts
/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    globals: true,
  },
})
```

**Step 3: Criar `tsconfig.json`** (raiz, apenas referências)

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**Step 4: Criar `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "vitest/globals"],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "tests"]
}
```

**Step 5: Criar `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 6: Criar `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Gere modelos 3D personalizados para impressão em segundos. Ajuste parâmetros, visualize e baixe STL prontos."
    />
    <title>3DFormio — Modelos 3D personalizados</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 7: Criar `public/favicon.svg`** (cubo isométrico, identidade da marca)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <polygon points="16,3 29,10 16,17 3,10" fill="#14b8a6" />
  <polygon points="3,10 16,17 16,29 3,22" fill="#0f766e" />
  <polygon points="29,10 16,17 16,29 29,22" fill="#0d9488" />
</svg>
```

**Step 8: Criar `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@aws-amplify/ui-react/styles.css'
import './index.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Step 9: Criar `src/index.css`** (Tailwind v4; as classes `.btn-*` e animação entram nas tasks 6 e 7)

```css
@import "tailwindcss";
```

**Step 10: Criar `src/app/App.tsx`** (placeholder mínimo; evolui nas tasks 3 e 12)

```tsx
export function App() {
  return <main>3DFormio</main>
}
```

**Step 11: Criar `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

**Step 12: Criar `eslint.config.js`**

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'amplify'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
)
```

**Step 13: Criar `.gitignore`**

```
node_modules
dist
coverage
*.local
.env
.env.*
!.env.example

# Amplify Gen2 (gerados localmente)
amplify_outputs.json
.amplify
amplify/.amplify
```

**Step 14: Instalar dependências**

Run: `npm install`
Expected: instalação concluída sem erros, cria `package-lock.json`.

**Step 15: Verificar build**

Run: `npm run build`
Expected: `tsc -b` + `vite build` concluem sem erros; `dist/` gerado.

**Step 16: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json index.html public/favicon.svg src eslint.config.js .gitignore
git commit -m "chore: scaffold Vite + React 19 + TypeScript + Tailwind"
```

---

### Task 2: Vitest + Testing Library + smoke test do App

**Files:**
- Create: `tests/setup.ts`, `tests/app/App.test.tsx`

**Step 1: Criar `tests/setup.ts`** (jest-dom + mock de `matchMedia` — o ThemeProvider com `colorMode="system"` usa `matchMedia`, ausente no jsdom)

```ts
import '@testing-library/jest-dom/vitest'

const mockMatchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
})

window.matchMedia = mockMatchMedia
```

**Step 2: Criar o teste smoke `tests/app/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { App } from '@/app/App'

describe('App', () => {
  it('renderiza sem crash', () => {
    render(<App />)
    expect(screen.getByText('3DFormio')).toBeInTheDocument()
  })
})
```

**Step 3: Rodar o teste**

Run: `npm run test`
Expected: PASS (1 teste). Se falhar com erro de alias `@`, confirme o `resolve.alias` e `paths` da Task 1.

**Step 4: Rodar lint e typecheck**

Run: `npm run lint && npm run typecheck`
Expected: sem erros.

**Step 5: Commit**

```bash
git add tests vite.config.ts tsconfig.app.json package.json package-lock.json
git commit -m "test: adiciona Vitest com Testing Library e smoke test do App"
```

*(Nota: o Vitest já foi configurado no `vite.config.ts`/`tsconfig.app.json` da Task 1; inclua-os no commit se houver ajuste.)*

---

### Task 3: Tema custom do Amplify UI (ThemeProvider)

**Files:**
- Create: `src/theme/index.ts`
- Modify: `src/app/App.tsx`

**Step 1: Escrever o teste que falha** — em `tests/app/App.test.tsx`, adicionar:

```tsx
  it('aplica o tema custom do 3DFormio', () => {
    const { container } = render(<App />)
    expect(container.querySelector('[data-amplify-theme="3dformio"]')).not.toBeNull()
  })
```

**Step 2: Rodar para verificar que falha**

Run: `npx vitest run tests/app/App.test.tsx`
Expected: FAIL — atributo `data-amplify-theme="3dformio"` não encontrado (App não usa ThemeProvider).

**Step 3: Criar `src/theme/index.ts`** (brand teal mapeado na paleta `primary`, conforme `docs/ui/theme.md` — referências a tokens, sem duplicar valores)

```ts
import type { Theme } from '@aws-amplify/ui-react'

export const theme: Theme = {
  name: '3dformio',
  tokens: {
    colors: {
      primary: {
        10: '{colors.teal.10}',
        20: '{colors.teal.20}',
        40: '{colors.teal.40}',
        60: '{colors.teal.60}',
        80: '{colors.teal.80}',
        90: '{colors.teal.90}',
        100: '{colors.teal.100}',
      },
    },
  },
}
```

**Step 4: Atualizar `src/app/App.tsx`**

```tsx
import { ThemeProvider } from '@aws-amplify/ui-react'
import { theme } from '@/theme'

export function App() {
  return (
    <ThemeProvider theme={theme} colorMode="system">
      <main>3DFormio</main>
    </ThemeProvider>
  )
}
```

**Step 5: Rodar o teste**

Run: `npx vitest run tests/app/App.test.tsx`
Expected: PASS (2 testes).

**Step 6: Commit**

```bash
git add src/theme src/app/App.tsx tests/app/App.test.tsx
git commit -m "feat: aplica tema custom do Amplify UI"
```

---

### Task 4: Config de planos (TDD)

**Files:**
- Create: `src/features/landing/config/plans.ts`
- Test: `tests/features/landing/config/plans.test.ts`

**Step 1: Escrever o teste que falha** — `tests/features/landing/config/plans.test.ts`:

```ts
import { plans } from '@/features/landing/config/plans'

describe('plans', () => {
  it('contém exatamente 3 planos', () => {
    expect(plans).toHaveLength(3)
  })

  it('destaca exatamente o plano Pro', () => {
    const highlighted = plans.filter((plan) => plan.highlighted)
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0]?.id).toBe('pro')
  })

  it('todo plano possui campos obrigatórios preenchidos e CTA para /cadastro', () => {
    for (const plan of plans) {
      expect(plan.id.trim()).not.toBe('')
      expect(plan.name.trim()).not.toBe('')
      expect(plan.price.trim()).not.toBe('')
      expect(plan.period.trim()).not.toBe('')
      expect(plan.description.trim()).not.toBe('')
      expect(plan.features.length).toBeGreaterThan(0)
      expect(plan.ctaLabel.trim()).not.toBe('')
      expect(plan.ctaHref).toBe('/cadastro')
    }
  })

  it('lista apenas features não vazias', () => {
    for (const plan of plans) {
      for (const feature of plan.features) {
        expect(feature.trim()).not.toBe('')
      }
    }
  })
})
```

**Step 2: Rodar para verificar que falha**

Run: `npx vitest run tests/features/landing/config/plans.test.ts`
Expected: FAIL — `Cannot find module '@/features/landing/config/plans'`.

**Step 3: Criar `src/features/landing/config/plans.ts`** (valores placeholder — trocar aqui quando o negócio definir preços)

```ts
export interface Plan {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlighted: boolean
  ctaLabel: string
  ctaHref: string
}

export const plans: Plan[] = [
  {
    id: 'gratis',
    name: 'Grátis',
    price: 'R$ 0',
    period: 'para sempre',
    description: 'Para conhecer a plataforma.',
    features: [
      'Acesso ao gerador básico',
      '3 gerações por mês',
      'Download em STL',
      'Histórico de modelos',
    ],
    highlighted: false,
    ctaLabel: 'Começar grátis',
    ctaHref: '/cadastro',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 29',
    period: 'por mês',
    description: 'Para quem imprime com frequência.',
    features: [
      'Gerações ilimitadas',
      '100 créditos por mês',
      'Todos os modelos premium',
      'Suporte por e-mail',
    ],
    highlighted: true,
    ctaLabel: 'Assinar o Pro',
    ctaHref: '/cadastro',
  },
  {
    id: 'business',
    name: 'Business',
    price: 'R$ 89',
    period: 'por mês',
    description: 'Para equipes e negócios.',
    features: [
      'Tudo do Pro',
      '500 créditos por mês',
      'Uso comercial dos modelos',
      'Suporte prioritário',
    ],
    highlighted: false,
    ctaLabel: 'Assinar o Business',
    ctaHref: '/cadastro',
  },
]
```

**Step 4: Rodar o teste**

Run: `npx vitest run tests/features/landing/config/plans.test.ts`
Expected: PASS (4 testes).

**Step 5: Commit**

```bash
git add src/features/landing/config/plans.ts tests/features/landing/config/plans.test.ts
git commit -m "feat: adiciona configuração de planos da landing"
```

---

### Task 5: Config de FAQ (TDD)

**Files:**
- Create: `src/features/landing/config/faq.ts`
- Test: `tests/features/landing/config/faq.test.ts`

**Step 1: Escrever o teste que falha** — `tests/features/landing/config/faq.test.ts`:

```ts
import { faqItems } from '@/features/landing/config/faq'

describe('faqItems', () => {
  it('contém entre 5 e 6 perguntas', () => {
    expect(faqItems.length).toBeGreaterThanOrEqual(5)
    expect(faqItems.length).toBeLessThanOrEqual(6)
  })

  it('toda pergunta possui resposta não vazia', () => {
    for (const item of faqItems) {
      expect(item.question.trim()).not.toBe('')
      expect(item.answer.trim()).not.toBe('')
    }
  })

  it('não repete perguntas', () => {
    const questions = faqItems.map((item) => item.question)
    expect(new Set(questions).size).toBe(questions.length)
  })
})
```

**Step 2: Rodar para verificar que falha**

Run: `npx vitest run tests/features/landing/config/faq.test.ts`
Expected: FAIL — `Cannot find module '@/features/landing/config/faq'`.

**Step 3: Criar `src/features/landing/config/faq.ts`**

```ts
export interface FaqItem {
  question: string
  answer: string
}

export const faqItems: FaqItem[] = [
  {
    question: 'Preciso instalar algo para usar o 3DFormio?',
    answer:
      'Não. Tudo funciona no navegador: você ajusta os parâmetros, visualiza o resultado e baixa o arquivo. Sem instalação e sem configuração.',
  },
  {
    question: 'Quais formatos de download estão disponíveis?',
    answer:
      'Hoje todos os modelos são gerados em STL, o formato mais compatível com impressoras 3D e fatiadores como Cura, PrusaSlicer e Bambu Studio.',
  },
  {
    question: 'O que são créditos?',
    answer:
      'Créditos são a moeda do 3DFormio. Cada geração de modelo consome créditos, que são renovados mensalmente conforme o seu plano.',
  },
  {
    question: 'Os modelos estão prontos para impressão?',
    answer:
      'Sim. Todo modelo gerado é um sólido válido e manifold, pronto para fatiar e imprimir, com parâmetros como tolerâncias e espessuras validados.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer:
      'Sim. O cancelamento é feito pelo painel da sua conta. Você mantém o acesso até o fim do período já pago e não perde seu histórico de modelos.',
  },
  {
    question: 'Posso usar os modelos comercialmente?',
    answer:
      'No plano Business sim, sem restrições. Nos planos Grátis e Pro o uso é permitido para projetos pessoais e de portfólio.',
  },
]
```

**Step 4: Rodar o teste**

Run: `npx vitest run tests/features/landing/config/faq.test.ts`
Expected: PASS (3 testes).

**Step 5: Commit**

```bash
git add src/features/landing/config/faq.ts tests/features/landing/config/faq.test.ts
git commit -m "feat: adiciona configuração de FAQ da landing"
```

---

### Task 6: Navbar + classes de botão DRY (TDD)

**Files:**
- Create: `src/features/landing/components/Navbar.tsx`
- Modify: `src/index.css` (classes `.btn-primary` / `.btn-secondary`)
- Test: `tests/features/landing/components/Navbar.test.tsx`

**Step 1: Escrever o teste que falha** — `tests/features/landing/components/Navbar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from '@/features/landing/components/Navbar'

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )
}

describe('Navbar', () => {
  it('exibe a logo 3DFormio com link para a home', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: '3DFormio' })).toHaveAttribute('href', '/')
  })

  it('exibe link de criar conta apontando para /cadastro', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
  })

  it('exibe links de âncora para preços e FAQ', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Preços' })).toHaveAttribute('href', '#precos')
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#faq')
  })
})
```

**Step 2: Rodar para verificar que falha**

Run: `npx vitest run tests/features/landing/components/Navbar.test.tsx`
Expected: FAIL — `Cannot find module '@/features/landing/components/Navbar'`.

**Step 3: Adicionar as classes de botão em `src/index.css`** (Tailwind v4 `@apply`; usadas por Navbar, Hero, PricingSection e PlaceholderPage)

```css
@import "tailwindcss";

.btn-primary {
  @apply inline-flex items-center justify-center rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white no-underline transition-colors hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600;
}

.btn-secondary {
  @apply inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 no-underline transition-colors hover:border-neutral-400 hover:text-neutral-900;
}
```

**Step 4: Criar `src/features/landing/components/Navbar.tsx`**

```tsx
import { Flex, View } from '@aws-amplify/ui-react'
import { Link, NavLink } from 'react-router-dom'

const anchorLinkClassName =
  'text-sm font-medium text-neutral-600 no-underline transition-colors hover:text-neutral-900'

export function Navbar() {
  return (
    <View
      as="header"
      className="sticky top-0 z-20 border-b border-neutral-200/60 bg-white/80 backdrop-blur"
    >
      <Flex
        as="nav"
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        padding="medium"
        maxWidth="1120px"
        margin="0 auto"
      >
        <NavLink
          to="/"
          className="text-lg font-bold tracking-tight text-neutral-900 no-underline"
        >
          3DFormio
        </NavLink>
        <Flex direction="row" gap="xl" alignItems="center">
          <a href="#precos" className={anchorLinkClassName}>
            Preços
          </a>
          <a href="#faq" className={anchorLinkClassName}>
            FAQ
          </a>
          <Link to="/cadastro" className="btn-primary">
            Criar conta
          </Link>
        </Flex>
      </Flex>
    </View>
  )
}
```

**Step 5: Rodar o teste**

Run: `npx vitest run tests/features/landing/components/Navbar.test.tsx`
Expected: PASS (3 testes).

**Step 6: Commit**

```bash
git add src/features/landing/components/Navbar.tsx src/index.css tests/features/landing/components/Navbar.test.tsx
git commit -m "feat: adiciona navbar da landing"
```

---

### Task 7: Hero + HeroVisual SVG animado (TDD)

**Files:**
- Create: `src/features/landing/components/Hero.tsx`, `src/features/landing/components/HeroVisual.tsx`
- Modify: `src/index.css` (animação `hero-float`)
- Test: `tests/features/landing/components/Hero.test.tsx`

**Step 1: Escrever o teste que falha** — `tests/features/landing/components/Hero.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Hero } from '@/features/landing/components/Hero'

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  )
}

describe('Hero', () => {
  it('exibe a headline principal', () => {
    renderHero()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Modelos 3D personalizados em segundos' }),
    ).toBeInTheDocument()
  })

  it('exibe CTA primário apontando para /cadastro', () => {
    renderHero()
    expect(screen.getByRole('link', { name: 'Começar grátis' })).toHaveAttribute(
      'href',
      '/cadastro',
    )
  })

  it('exibe CTA secundário apontando para a seção de preços', () => {
    renderHero()
    expect(screen.getByRole('link', { name: 'Ver preços' })).toHaveAttribute('href', '#precos')
  })

  it('renderiza o visual com rótulo acessível', () => {
    renderHero()
    expect(screen.getByRole('img', { name: /ilustração de modelos 3d/i })).toBeInTheDocument()
  })
})
```

**Step 2: Rodar para verificar que falha**

Run: `npx vitest run tests/features/landing/components/Hero.test.tsx`
Expected: FAIL — `Cannot find module '@/features/landing/components/Hero'`.

**Step 3: Adicionar animação em `src/index.css`** (respeita `prefers-reduced-motion`)

```css
@keyframes hero-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}

.hero-float {
  animation: hero-float 6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .hero-float {
    animation: none;
  }
}
```

**Step 4: Criar `src/features/landing/components/HeroVisual.tsx`** (SVG leve — substituível por WebP real no mesmo componente)

```tsx
export function HeroVisual() {
  return (
    <svg
      viewBox="0 0 360 360"
      className="hero-float h-auto w-full max-w-md drop-shadow-xl"
      role="img"
      aria-label="Ilustração de modelos 3D gerados por parâmetros"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="heroTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id="heroRight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <ellipse cx="180" cy="312" rx="104" ry="14" fill="#0f766e" opacity="0.12" />
      <g>
        <polygon points="180,72 268,120 180,168 92,120" fill="url(#heroTop)" />
        <polygon points="92,120 180,168 180,264 92,216" fill="#115e59" />
        <polygon points="268,120 180,168 180,264 268,216" fill="url(#heroRight)" />
      </g>
      <g>
        <polygon points="292,176 326,194 292,212 258,194" fill="#5eead4" />
        <polygon points="258,194 292,212 292,238 258,220" fill="#0f766e" />
        <polygon points="326,194 292,212 292,238 326,220" fill="#14b8a6" />
      </g>
      <g opacity="0.85">
        <polygon points="76,208 104,223 76,238 48,223" fill="#5eead4" />
        <polygon points="48,223 76,238 76,260 48,245" fill="#0f766e" />
        <polygon points="104,223 76,238 76,260 104,245" fill="#14b8a6" />
      </g>
      <circle cx="86" cy="96" r="5" fill="#14b8a6" />
      <circle cx="286" cy="84" r="4" fill="#2dd4bf" />
      <circle cx="316" cy="264" r="4" fill="#0d9488" />
    </svg>
  )
}
```

**Step 5: Criar `src/features/landing/components/Hero.tsx`**

```tsx
import { Flex, Heading, Text, View } from '@aws-amplify/ui-react'
import { Link } from 'react-router-dom'
import { HeroVisual } from './HeroVisual'

export function Hero() {
  return (
    <View as="section" padding={{ base: 'xxl', large: 'xxxl' }}>
      <Flex
        direction={{ base: 'column', large: 'row' }}
        alignItems="center"
        justifyContent="space-between"
        gap="xxl"
        maxWidth="1120px"
        margin="0 auto"
      >
        <Flex direction="column" gap="large" maxWidth="560px">
          <Heading level={1} fontSize={{ base: 'xxxl', large: 'xxxxl' }} color="font.primary">
            Modelos 3D personalizados em segundos
          </Heading>
          <Text fontSize="large" color="font.tertiary">
            Ajuste parâmetros, visualize e baixe STL prontos para impressão — sem instalar nada.
          </Text>
          <Flex direction="row" gap="medium" wrap="wrap">
            <Link to="/cadastro" className="btn-primary">
              Começar grátis
            </Link>
            <a href="#precos" className="btn-secondary">
              Ver preços
            </a>
          </Flex>
        </Flex>
        <HeroVisual />
      </Flex>
    </View>
  )
}
```

**Step 6: Rodar o teste**

Run: `npx vitest run tests/features/landing/components/Hero.test.tsx`
Expected: PASS (4 testes).

**Step 7: Commit**

```bash
git add src/features/landing/components/Hero.tsx src/features/landing/components/HeroVisual.tsx src/index.css tests/features/landing/components/Hero.test.tsx
git commit -m "feat: adiciona hero com visual estático animado"
```

---

### Task 8: PricingSection (TDD)

**Files:**
- Create: `src/features/landing/components/PricingSection.tsx`
- Test: `tests/features/landing/components/PricingSection.test.tsx`

**Step 1: Escrever o teste que falha** — `tests/features/landing/components/PricingSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PricingSection } from '@/features/landing/components/PricingSection'

function renderPricingSection() {
  return render(
    <MemoryRouter>
      <PricingSection />
    </MemoryRouter>,
  )
}

describe('PricingSection', () => {
  it('renderiza o título da seção', () => {
    renderPricingSection()
    expect(screen.getByRole('heading', { name: /planos para cada etapa/i })).toBeInTheDocument()
  })

  it('renderiza os três planos', () => {
    renderPricingSection()
    expect(screen.getByRole('heading', { name: 'Grátis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Business' })).toBeInTheDocument()
  })

  it('marca exatamente o plano Pro como mais popular', () => {
    renderPricingSection()
    expect(screen.getAllByText('Mais popular')).toHaveLength(1)
  })

  it('aponta todos os CTAs dos planos para /cadastro', () => {
    renderPricingSection()
    const ctas = screen.getAllByRole('link', { name: /começar|assinar/i })
    expect(ctas).toHaveLength(3)
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', '/cadastro')
    }
  })

  it('renderiza as features dos planos', () => {
    renderPricingSection()
    expect(screen.getByText('100 créditos por mês')).toBeInTheDocument()
    expect(screen.getByText('500 créditos por mês')).toBeInTheDocument()
  })
})
```

**Step 2: Rodar para verificar que falha**

Run: `npx vitest run tests/features/landing/components/PricingSection.test.tsx`
Expected: FAIL — `Cannot find module '@/features/landing/components/PricingSection'`.

**Step 3: Criar `src/features/landing/components/PricingSection.tsx`**

```tsx
import { Badge, Card, Flex, Heading, Text, View } from '@aws-amplify/ui-react'
import { Link } from 'react-router-dom'
import { plans } from '../config/plans'

export function PricingSection() {
  return (
    <View
      as="section"
      id="precos"
      padding={{ base: 'xxl', large: 'xxxl' }}
      backgroundColor="background.secondary"
    >
      <Flex
        direction="column"
        alignItems="center"
        gap="xxl"
        maxWidth="1120px"
        margin="0 auto"
      >
        <Flex direction="column" alignItems="center" gap="medium">
          <Heading level={2} fontSize="xxl" color="font.primary">
            Planos para cada etapa
          </Heading>
          <Text color="font.tertiary">Comece grátis e evolua conforme suas impressões.</Text>
        </Flex>
        <Flex
          direction={{ base: 'column', large: 'row' }}
          gap="large"
          justifyContent="center"
          alignItems={{ base: 'center', large: 'stretch' }}
        >
          {plans.map((plan) => (
            <Card
              key={plan.id}
              variation={plan.highlighted ? 'elevated' : 'outlined'}
              className={
                plan.highlighted
                  ? 'w-full max-w-sm border-2 border-teal-600'
                  : 'w-full max-w-sm'
              }
            >
              <Flex direction="column" gap="medium" minHeight="100%">
                {plan.highlighted ? <Badge variation="success">Mais popular</Badge> : null}
                <Heading level={3} color="font.primary">
                  {plan.name}
                </Heading>
                <Flex direction="row" alignItems="baseline" gap="xs">
                  <Text fontSize="xxl" fontWeight="bold" color="font.primary">
                    {plan.price}
                  </Text>
                  <Text color="font.tertiary">{plan.period}</Text>
                </Flex>
                <Text color="font.tertiary">{plan.description}</Text>
                <ul className="flex flex-col gap-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-neutral-700"
                    >
                      <span aria-hidden="true" className="mt-0.5 text-teal-600">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.ctaHref}
                  className={plan.highlighted ? 'btn-primary mt-auto' : 'btn-secondary mt-auto'}
                >
                  {plan.ctaLabel}
                </Link>
              </Flex>
            </Card>
          ))}
        </Flex>
      </Flex>
    </View>
  )
}
```

**Step 4: Rodar o teste**

Run: `npx vitest run tests/features/landing/components/PricingSection.test.tsx`
Expected: PASS (5 testes).

**Step 5: Commit**

```bash
git add src/features/landing/components/PricingSection.tsx tests/features/landing/components/PricingSection.test.tsx
git commit -m "feat: adiciona seção de preços"
```

---

### Task 9: FaqSection com Accordion (TDD)

**Files:**
- Create: `src/features/landing/components/FaqSection.tsx`
- Test: `tests/features/landing/components/FaqSection.test.tsx`

**Step 1: Escrever o teste que falha** — `tests/features/landing/components/FaqSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FaqSection } from '@/features/landing/components/FaqSection'

describe('FaqSection', () => {
  it('renderiza o título e todas as perguntas', () => {
    render(<FaqSection />)
    expect(screen.getByRole('heading', { name: /perguntas frequentes/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /preciso instalar algo/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /o que são créditos/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /posso cancelar quando quiser/i }),
    ).toBeInTheDocument()
  })

  it('exibe a resposta ao expandir uma pergunta', async () => {
    const user = userEvent.setup()
    render(<FaqSection />)
    await user.click(screen.getByRole('button', { name: /o que são créditos/i }))
    expect(screen.getByText(/créditos são a moeda do 3dformio/i)).toBeVisible()
  })
})
```

**Executor note:** se o `Accordion` do Amplify UI não alternar visibilidade no jsdom (limitação de CSS do ambiente), troque `toBeVisible()` por `toBeInTheDocument()` — o comportamento de expandir/colapsar é do componente e não será reescrito.

**Step 2: Rodar para verificar que falha**

Run: `npx vitest run tests/features/landing/components/FaqSection.test.tsx`
Expected: FAIL — `Cannot find module '@/features/landing/components/FaqSection'`.

**Step 3: Criar `src/features/landing/components/FaqSection.tsx`**

```tsx
import { Accordion, Flex, Heading, View } from '@aws-amplify/ui-react'
import { faqItems } from '../config/faq'

export function FaqSection() {
  return (
    <View as="section" id="faq" padding={{ base: 'xxl', large: 'xxxl' }}>
      <Flex direction="column" alignItems="center" gap="xxl" maxWidth="760px" margin="0 auto">
        <Heading level={2} fontSize="xxl" color="font.primary">
          Perguntas frequentes
        </Heading>
        <Accordion allowMultiple width="100%">
          {faqItems.map((item) => (
            <Accordion.Item key={item.question} value={item.question}>
              <Accordion.Trigger>
                <Accordion.Title>{item.question}</Accordion.Title>
                <Accordion.Icon />
              </Accordion.Trigger>
              <Accordion.Content>{item.answer}</Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      </Flex>
    </View>
  )
}
```

**Step 4: Rodar o teste**

Run: `npx vitest run tests/features/landing/components/FaqSection.test.tsx`
Expected: PASS (2 testes).

**Step 5: Commit**

```bash
git add src/features/landing/components/FaqSection.tsx tests/features/landing/components/FaqSection.test.tsx
git commit -m "feat: adiciona seção de FAQ"
```

---

### Task 10: Footer (TDD)

**Files:**
- Create: `src/features/landing/components/Footer.tsx`
- Test: `tests/features/landing/components/Footer.test.tsx`

**Step 1: Escrever o teste que falha** — `tests/features/landing/components/Footer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Footer } from '@/features/landing/components/Footer'

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  )
}

describe('Footer', () => {
  it('renderiza como rodapé semântico com a marca', () => {
    renderFooter()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByText('Modelos 3D personalizados para impressão.')).toBeInTheDocument()
  })

  it('exibe links de termos e privacidade como rotas', () => {
    renderFooter()
    expect(screen.getByRole('link', { name: 'Termos' })).toHaveAttribute('href', '/termos')
    expect(screen.getByRole('link', { name: 'Privacidade' })).toHaveAttribute(
      'href',
      '/privacidade',
    )
  })

  it('exibe o copyright com o ano corrente', () => {
    renderFooter()
    const year = new Date().getFullYear()
    expect(screen.getByText(new RegExp(`© ${year} 3DFormio`))).toBeInTheDocument()
  })
})
```

**Step 2: Rodar para verificar que falha**

Run: `npx vitest run tests/features/landing/components/Footer.test.tsx`
Expected: FAIL — `Cannot find module '@/features/landing/components/Footer'`.

**Step 3: Criar `src/features/landing/components/Footer.tsx`**

```tsx
import { Flex, Text, View } from '@aws-amplify/ui-react'
import { Link } from 'react-router-dom'

const footerLinkClassName =
  'text-sm text-neutral-600 no-underline transition-colors hover:text-neutral-900'

export function Footer() {
  return (
    <View as="footer" padding="xxl" backgroundColor="background.secondary">
      <Flex
        direction={{ base: 'column', medium: 'row' }}
        justifyContent="space-between"
        gap="large"
        maxWidth="1120px"
        margin="0 auto"
      >
        <Flex direction="column" gap="xs">
          <span className="text-lg font-bold text-neutral-900">3DFormio</span>
          <Text color="font.tertiary" fontSize="small">
            Modelos 3D personalizados para impressão.
          </Text>
        </Flex>
        <Flex direction="row" gap="xl">
          <a href="#precos" className={footerLinkClassName}>
            Preços
          </a>
          <a href="#faq" className={footerLinkClassName}>
            FAQ
          </a>
          <Link to="/termos" className={footerLinkClassName}>
            Termos
          </Link>
          <Link to="/privacidade" className={footerLinkClassName}>
            Privacidade
          </Link>
        </Flex>
      </Flex>
      <Text fontSize="small" color="font.tertiary" textAlign="center" marginTop="xxl">
        © {new Date().getFullYear()} 3DFormio. Todos os direitos reservados.
      </Text>
    </View>
  )
}
```

**Step 4: Rodar o teste**

Run: `npx vitest run tests/features/landing/components/Footer.test.tsx`
Expected: PASS (3 testes).

**Step 5: Commit**

```bash
git add src/features/landing/components/Footer.tsx tests/features/landing/components/Footer.test.tsx
git commit -m "feat: adiciona footer"
```

---

### Task 11: PlaceholderPage para rotas futuras (TDD)

**Files:**
- Create: `src/app/PlaceholderPage.tsx`
- Test: `tests/app/PlaceholderPage.test.tsx`

**Step 1: Escrever o teste que falha** — `tests/app/PlaceholderPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlaceholderPage } from '@/app/PlaceholderPage'

function renderPlaceholderPage(title: string) {
  return render(
    <MemoryRouter>
      <PlaceholderPage title={title} />
    </MemoryRouter>,
  )
}

describe('PlaceholderPage', () => {
  it('exibe o título recebido como heading principal', () => {
    renderPlaceholderPage('Criar conta')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Criar conta' }),
    ).toBeInTheDocument()
  })

  it('exibe mensagem de em breve', () => {
    renderPlaceholderPage('Criar conta')
    expect(screen.getByText('Esta página chega em breve.')).toBeInTheDocument()
  })

  it('oferece link de volta para a home', () => {
    renderPlaceholderPage('Criar conta')
    expect(screen.getByRole('link', { name: /voltar para a home/i })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
```

**Step 2: Rodar para verificar que falha**

Run: `npx vitest run tests/app/PlaceholderPage.test.tsx`
Expected: FAIL — `Cannot find module '@/app/PlaceholderPage'`.

**Step 3: Criar `src/app/PlaceholderPage.tsx`**

```tsx
import { Flex, Heading, Text } from '@aws-amplify/ui-react'
import { Link } from 'react-router-dom'

interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Flex
      as="main"
      direction="column"
      alignItems="center"
      justifyContent="center"
      gap="medium"
      padding="xxxl"
      minHeight="60vh"
    >
      <Heading level={1} color="font.primary">
        {title}
      </Heading>
      <Text color="font.tertiary">Esta página chega em breve.</Text>
      <Link to="/" className="btn-primary">
        Voltar para a home
      </Link>
    </Flex>
  )
}
```

**Step 4: Rodar o teste**

Run: `npx vitest run tests/app/PlaceholderPage.test.tsx`
Expected: PASS (3 testes).

**Step 5: Commit**

```bash
git add src/app/PlaceholderPage.tsx tests/app/PlaceholderPage.test.tsx
git commit -m "feat: adiciona página placeholder para rotas futuras"
```

---

### Task 12: LandingPage + roteamento no App (TDD)

**Files:**
- Create: `src/features/landing/LandingPage.tsx`
- Modify: `src/app/App.tsx`, `tests/app/App.test.tsx`
- Test: `tests/features/landing/LandingPage.test.tsx`

**Step 1: Escrever os testes que falham**

`tests/features/landing/LandingPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage } from '@/features/landing/LandingPage'

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

describe('LandingPage', () => {
  it('renderiza o hero com a headline principal', () => {
    renderLandingPage()
    expect(
      screen.getByRole('heading', { level: 1, name: /modelos 3d personalizados em segundos/i }),
    ).toBeInTheDocument()
  })

  it('renderiza as seções de preços e FAQ', () => {
    renderLandingPage()
    expect(screen.getByRole('heading', { name: /planos para cada etapa/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /perguntas frequentes/i })).toBeInTheDocument()
  })

  it('renderiza navbar e footer', () => {
    renderLandingPage()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
```

Substituir TODO o conteúdo de `tests/app/App.test.tsx` (o teste antigo `getByText('3DFormio')` agora colidiria com múltiplos elementos):

```tsx
import { render, screen } from '@testing-library/react'
import { App } from '@/app/App'

describe('App', () => {
  it('renderiza a landing na rota raiz', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Modelos 3D personalizados em segundos' }),
    ).toBeInTheDocument()
  })

  it('aplica o tema custom do 3DFormio', () => {
    const { container } = render(<App />)
    expect(container.querySelector('[data-amplify-theme="3dformio"]')).not.toBeNull()
  })
})
```

**Step 2: Rodar para verificar que falham**

Run: `npx vitest run tests/features/landing/LandingPage.test.tsx tests/app/App.test.tsx`
Expected: FAIL — `Cannot find module '@/features/landing/LandingPage'` e o teste de tema/rota raiz falha (App ainda é o placeholder).

**Step 3: Criar `src/features/landing/LandingPage.tsx`**

```tsx
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { PricingSection } from './components/PricingSection'
import { FaqSection } from './components/FaqSection'
import { Footer } from './components/Footer'

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <PricingSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  )
}
```

**Step 4: Atualizar `src/app/App.tsx`**

```tsx
import { ThemeProvider } from '@aws-amplify/ui-react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/features/landing/LandingPage'
import { PlaceholderPage } from '@/app/PlaceholderPage'
import { theme } from '@/theme'

export function App() {
  return (
    <ThemeProvider theme={theme} colorMode="system">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/cadastro" element={<PlaceholderPage title="Criar conta" />} />
          <Route path="/termos" element={<PlaceholderPage title="Termos de uso" />} />
          <Route
            path="/privacidade"
            element={<PlaceholderPage title="Política de privacidade" />}
          />
          <Route path="*" element={<PlaceholderPage title="Página não encontrada" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
```

**Step 5: Rodar os testes**

Run: `npm run test`
Expected: PASS — todos os testes de todas as tasks.

**Step 6: Verificar lint, typecheck e build**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: sem erros.

**Step 7: Commit**

```bash
git add src/features/landing/LandingPage.tsx src/app/App.tsx tests/features/landing/LandingPage.test.tsx tests/app/App.test.tsx
git commit -m "feat: compõe landing page e roteamento"
```

---

### Task 13: Amplify Gen2 — backend com Cognito

Infraestrutura (não há teste de unidade aplicável; verificação é typecheck + conteúdo esperado dos arquivos).

**Files:**
- Create: `amplify/backend.ts`, `amplify/auth/resource.ts` (via scaffolder oficial + ajuste)
- Modify: `package.json` (deps do backend + script `typecheck:amplify`)

**Step 1: Rodar o scaffolder oficial na raiz do projeto**

Run: `npm create amplify@latest`

Seleções esperadas (prompt interativo):
- Auth: **sim** — login com **email** (sem senha custom, sem MFA, sem atributos adicionais)
- Storage: **não**
- Function: **não**

Expected: cria `amplify/` com `backend.ts`, `auth/resource.ts`, `tsconfig.json` e adiciona `@aws-amplify/backend` + `@aws-amplify/backend-cli` ao `package.json`.

**Step 2: Ajustar `amplify/auth/resource.ts`** para o conteúdo alvo (login apenas por email):

```ts
import { defineAuth } from '@aws-amplify/backend'

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
})
```

**Step 3: Ajustar `amplify/backend.ts`** para o conteúdo alvo:

```ts
import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'

defineBackend({
  auth,
})
```

**Step 4: Adicionar o script de typecheck em `package.json`** (seção `scripts`):

```json
"typecheck:amplify": "tsc -p amplify/tsconfig.json --noEmit"
```

**Step 5: Verificar typecheck do backend**

Run: `npm run typecheck:amplify`
Expected: sem erros.

**Step 6: Verificação completa**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: tudo passa (o ESLint ignora `amplify/` conforme `eslint.config.js` da Task 1).

**Step 7: Commit**

```bash
git add amplify package.json package-lock.json
git commit -m "chore: inicializa backend Amplify Gen2 com autenticação"
```

**Executor note:** o deploy do sandbox (`npx ampx sandbox`) exige credenciais AWS configuradas. Se não houver credenciais neste ambiente, registre a pendência no relatório da task — o deploy fica a cargo do agente especializado em AWS Amplify.

---

### Task 14: CI com GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Criar `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run typecheck:amplify
      - run: npm run test
      - run: npm run build
```

**Step 2: Validar a sintaxe do workflow localmente**

Run: `node -e "JSON.stringify(require('js-yaml'))" 2>/dev/null || npx --yes js-yaml .github/workflows/ci.yml > /dev/null && echo OK`
Expected: `OK` (YAML válido).

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: adiciona workflow de verificação no GitHub Actions"
```

**Executor note:** a execução real do workflow acontece no GitHub após o primeiro push. Verificação local = YAML válido + todos os comandos do workflow passando localmente (já garantido na Task 13).

---

### Task 15: Documentação + verificação final

**Files:**
- Create: `README.md`, `docs/frontend/landing.md`

**Step 1: Criar `README.md`**

```markdown
# 3DFormio

SaaS de geração de modelos 3D paramétricos para impressão, inspirado no fluxo do
Confeitaria3D. Escolha parâmetros, visualize e baixe STL prontos para impressão.

## Stack

- **Frontend:** React 19, Vite, TypeScript (strict), TailwindCSS 4, Amplify UI, React Router
- **Backend:** Amplify Gen2 (Cognito, Lambda Container, API Gateway, S3, DynamoDB)
- **Qualidade:** Vitest, Testing Library, ESLint, GitHub Actions

## Desenvolvimento

```bash
npm install        # instala dependências
npm run dev        # servidor de desenvolvimento
npm run test       # testes (Vitest)
npm run lint       # lint
npm run typecheck  # typecheck do frontend
npm run build      # build de produção
```

Backend Amplify Gen2 (exige credenciais AWS):

```bash
npx ampx sandbox   # ambiente de desenvolvimento
```

## Estrutura

```
amplify/                      # Backend Amplify Gen2 (auth Cognito)
src/
  app/                        # App, roteamento, providers, páginas da aplicação
  features/landing/           # Feature da landing page (components + config)
  theme/                      # Tema custom do Amplify UI
tests/                        # Testes (espelham a estrutura de src)
docs/                         # Documentação do projeto
```

## Documentação

- Visão: `docs/project/vision.md`
- Arquitetura: `docs/project/architecture.md`
- Landing page: `docs/frontend/landing.md`
- Planos e designs: `docs/plans/`
```

**Step 2: Criar `docs/frontend/landing.md`**

```markdown
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
```

**Step 3: Verificação final completa**

Run: `npm run lint && npm run typecheck && npm run typecheck:amplify && npm run test && npm run build`
Expected: todos os comandos passam sem erros e sem warnings.

**Step 4: Conferir Definition of Done**

- [ ] Build sem erros
- [ ] Testes passando
- [ ] Lint sem erros
- [ ] TS strict válido, sem `any`
- [ ] Sem código morto, sem TODO
- [ ] Documentação atualizada (README + docs/frontend/landing.md)
- [ ] Rota `/cadastro` placeholder funcional (sem 404 nos CTAs)

**Step 5: Commit**

```bash
git add README.md docs/frontend/landing.md
git commit -m "docs: documenta landing page e atualiza README"
```

---

## Verification final (executor)

Ao término das 15 tasks, rodar e colar a saída de:

```bash
npm run lint && npm run typecheck && npm run typecheck:amplify && npm run test && npm run build
git log --oneline
```

Expected: 15+ commits semânticos, todos os comandos verdes, `dist/` gerado.
