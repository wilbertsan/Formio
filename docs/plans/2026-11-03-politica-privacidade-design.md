# Política de Privacidade — Design

**Goal:** Implementar a página pública `/privacidade` com a Política de Privacidade adaptada ao 3DFormio, reutilizando o layout jurídico existente.

**Architecture:** Extrair `LegalDocumentPage` como shell comum de documentos legais, com `LegalToc` genérico e `LegalArticle` recursivo. `TermsPage` e `PrivacyPage` passam a ser wrappers finos sobre configs tipadas.

**Tech Stack:** React 19, React Router 7, TypeScript strict, TailwindCSS 4, Amplify UI, Vitest + Testing Library.

## Decisões

- Conteúdo em `config/privacy.ts`, usando os tipos existentes `LegalSection`/`LegalNode`.
- Marca 3DFormio; planos Grátis/Pro/Business.
- Contatos placeholder `[e-mail de privacidade]` e `[e-mail de atendimento]`.
- Data “outubro de 2026”, conforme o texto de referência.
- Sem banner de cookies: o texto não promete “Rever cookies”; a revisão da escolha é feita pelos canais de privacidade enquanto o controle dedicado não existir.
- Sem novas dependências.

## Fora de escopo

Banner/consentimento de cookies, persistência de aceite, backend de privacidade e Política de Privacidade em outros idiomas.
