# Documentos legais

## Escopo

Páginas públicas institucionais e estáticas:

- `/termos` — Termos de Uso, incluindo cancelamento, devolução e reembolso
- `/privacidade` — Política de Privacidade

Não há autenticação, cobrança ou persistência nesta feature.

## Componentes

- `TermsPage.tsx` — wrapper dos Termos de Uso
- `PrivacyPage.tsx` — wrapper da Política de Privacidade
- `components/LegalDocumentPage.tsx` — shell compartilhado com `Navbar`, cabeçalho,
  índice, artigo, fechamento e `Footer`
- `components/LegalToc.tsx` — índice com âncoras por seção
- `components/LegalArticle.tsx` — renderer recursivo de seções, subseções e listas

## Config

- `config/terms.ts` — texto e tipos `LegalSection`/`LegalNode` dos Termos
- `config/privacy.ts` — texto da Política de Privacidade

## Regras de conteúdo

- Marca sempre **3DFormio**
- Operadora: VFBS AUTOMACAO E SISTEMAS, CNPJ 62.773.386/0001-21
- Planos: **Grátis**, **Pro** e **Business**
- Contatos placeholder nos Termos: `[e-mail de contato]` e `[e-mail de reembolso]`
- Contatos placeholder na Privacidade: `[e-mail de privacidade]` e `[e-mail de atendimento]`
- Não reintroduzir referências à Confeitaria3D nem nomes antigos de planos
- Toda alteração textual deve acontecer em `config/*.ts`, não no JSX
- Não prometer controle de cookies no rodapé enquanto ele não existir

## Testes

`tests/features/legal/` cobre o contrato dos conteúdos e a renderização das páginas.
Rodar: `npm run test`.
