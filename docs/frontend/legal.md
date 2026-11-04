# Termos de Uso e Política de Privacidade

## Visão geral

Páginas públicas institucionais em PT-BR:

- `/termos` — Termos de Uso, incluindo cancelamento, devolução e reembolso
- `/privacidade` — Política de Privacidade

O conteúdo foi adaptado da referência jurídica da Confeitaria3D para a marca, os
planos e a operação do 3DFormio. As duas páginas compartilham o mesmo layout e o
mesmo renderer de conteúdo.

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `src/features/legal/TermsPage.tsx` | Wrapper dos Termos de Uso |
| `src/features/legal/PrivacyPage.tsx` | Wrapper da Política de Privacidade |
| `src/features/legal/components/LegalDocumentPage.tsx` | Shell: `Navbar`, cabeçalho, índice, artigo, fechamento e `Footer` |
| `src/features/legal/components/LegalToc.tsx` | Índice lateral com âncoras e rótulo acessível |
| `src/features/legal/components/LegalArticle.tsx` | Renderização recursiva de seções, subseções, parágrafos e listas |
| `src/features/legal/config/terms.ts` | Texto, tipos e data dos Termos |
| `src/features/legal/config/privacy.ts` | Texto e data da Política de Privacidade |

## Modelo de conteúdo

```ts
type LegalNode =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'subsection'; id: string; number: string; title: string; children: LegalNode[] }

interface LegalSection {
  id: string
  number: string
  title: string
  children: LegalNode[]
}
```

Cada seção de topo gera um `h2` com âncora (`id`). Cada subseção gera um `h3`
com âncora própria. O índice usa as seções de topo.

## Como editar

| O que | Onde |
|---|---|
| Texto dos Termos | `src/features/legal/config/terms.ts` |
| Texto da Privacidade | `src/features/legal/config/privacy.ts` |
| Datas de atualização | `termsUpdatedAt` e `privacyUpdatedAt` |
| Título, descrição e link de fechamento | `TermsPage.tsx` / `PrivacyPage.tsx` |
| Ordem e composição visual | `components/LegalDocumentPage.tsx` |
| Navegação e âncoras | `components/LegalToc.tsx` |
| Estilo do texto jurídico | `components/LegalArticle.tsx` |

## Decisões

- **Layout compartilhado:** `LegalDocumentPage` evita duplicar shell, cabeçalho,
  índice e `Footer` entre as duas páginas.
- **Conteúdo dirigido por config tipada:** revisões jurídicas acontecem em um único
  arquivo por documento e são cobertas por teste.
- **Renderer recursivo:** evita duplicação entre seções, subseções e listas.
- **Adaptação de marca:** 3DFormio no lugar de Confeitaria3D; planos
  Livre/Arte/PRO mapeados para Grátis/Pro/Business.
- **Contatos placeholder:** `[e-mail de contato]`/`[e-mail de reembolso]` nos Termos
  e `[e-mail de privacidade]`/`[e-mail de atendimento]` na Privacidade.
- **Cookies:** não há banner de consentimento nesta entrega. A Política de Privacidade
  não promete o link “Rever cookies”; a revisão da escolha é feita pelos canais de
  privacidade enquanto o controle dedicado não existir.
- **Âncoras da landing:** `Navbar` e `Footer` geram `/#precos` e `/#faq` fora da
  home, preservando `#precos` e `#faq` na própria landing.
- **Acessibilidade:** navegação semântica (`nav`, `article`, `section`), títulos
  hierárquicos, `aria-labelledby` em seções e `scroll-mt-24` para âncoras sob a
  navbar sticky.
- **Responsividade:** índice acima do artigo no mobile e fixo à esquerda em telas
  grandes; texto em coluna com largura de leitura controlada.

## Testes

`tests/features/legal/` cobre:

- contrato dos conteúdos (12 seções por documento, ids únicos, ausência de
  referências antigas);
- adaptação de marca, planos e contatos;
- renderização das páginas, índices, âncoras e links cruzados;
- rotas `/termos` e `/privacidade` em `tests/app/App.test.tsx`;
- âncoras contextuais de `Navbar` e `Footer`.

Rodar: `npm run test`.

## Fora de escopo

Persistência de aceite, versionamento jurídico no backend, banner/consentimento de
cookies e traduções oficiais.
