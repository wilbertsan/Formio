# Frontend

# Objetivo

Este documento define os padrões oficiais do frontend do projeto 3DFormio.

Toda interface deve ser:

- Simples
- Rápida
- Responsiva
- Escalável
- Reutilizável
- Tipada

O usuário deve conseguir gerar um modelo 3D sem precisar aprender CAD.

---

# Stack Oficial

Framework

React 19

Build

Vite

Linguagem

TypeScript

Estilo

TailwindCSS

Formulários

React Hook Form

Validação

Zod

Estado Remoto

TanStack Query

Renderização 3D

ThreeJS

React Three Fiber

Autenticação

AWS Amplify

---

# Filosofia

Componentes pequenos.

Código reutilizável.

Baixo acoplamento.

Alta coesão.

Nunca duplicar lógica.

Sempre pensar na experiência do usuário.

---

# Estrutura

src/

app/

assets/

components/

features/

hooks/

layouts/

lib/

pages/

providers/

routes/

schemas/

services/

store/

styles/

types/

utils/

---

# Organização

Cada feature deve ser independente.

Nunca colocar toda lógica dentro de pages.

Pages apenas organizam componentes.

---

# Estrutura das Features

features/

login/

components/

hooks/

services/

types/

schemas/

pages/

---

# Componentes

Existem três tipos.

UI

Componentes visuais.

Business

Componentes da feature.

Layout

Cabeçalho

Sidebar

Footer

Container

---

# Componentes UI

Devem ser reutilizáveis.

Não devem conhecer regras de negócio.

Exemplos

Button

Input

Card

Modal

Dialog

Table

Badge

Avatar

Tooltip

Tabs

Spinner

---

# Componentes Business

Conhecem apenas sua feature.

Exemplos

ProjectCard

GenerationProgress

ParameterForm

ModelSelector

PreviewViewer

CreditCounter

---

# Estado

Sempre perguntar

Este estado precisa ser global?

Se não precisar

utilizar useState.

---

# Estado Global

Utilizar apenas quando necessário.

Exemplos

Usuário

Tema

Idioma

Autenticação

---

# Estado Remoto

Toda comunicação com API deve utilizar

TanStack Query

Nunca utilizar useEffect para buscar dados.

---

# Cache

Toda consulta deve possuir cache.

Configurar staleTime.

Evitar requisições repetidas.

---

# Mutations

Sempre utilizar

useMutation

Nunca atualizar interface manualmente.

Invalidar cache.

---

# Formulários

Sempre utilizar

React Hook Form

Nunca utilizar dezenas de useState.

---

# Validação

Toda validação deve utilizar

Zod.

Nunca validar manualmente.

Backend continua sendo responsável pela validação final.

---

# Rotas

Organização

/

login

dashboard

projects

project/:id

generate

settings

billing

history

admin

---

# Layout

Aplicação deve possuir

Header

Sidebar

Content

Footer

---

# Responsividade

Desktop

Tablet

Mobile

Todos obrigatórios.

Nunca criar telas exclusivas para desktop.

---

# Tema

Suportar

Light

Dark

Seguir preferência do sistema.

---

# Tipagem

Nunca utilizar any.

Sempre declarar interfaces.

Preferir type para composição.

---

# Hooks

Criar hooks para lógica reutilizável.

Exemplos

useAuth

useProjects

useGeneration

useCredits

useModels

useDownload

---

# Serviços

Toda chamada HTTP deve ficar em

services/

Nunca chamar fetch dentro de componentes.

---

# API

Utilizar um client único.

Centralizar

Headers

JWT

Tratamento de erros

Retry

---

# Erros

Sempre apresentar mensagens amigáveis.

Nunca mostrar erro interno.

Exibir ações possíveis ao usuário.

---

# Loading

Toda requisição deve possuir

Loading

Erro

Sucesso

Nunca deixar telas vazias.

---

# Feedback

Utilizar

Toast

Skeleton

Progress

Loading

Success

Error

---

# Preview 3D

Utilizar React Three Fiber.

Permitir

Rotação

Zoom

Pan

Reset

Nunca bloquear interface durante renderização.

---

# Geração

Fluxo

Selecionar modelo

↓

Preencher parâmetros

↓

Validar

↓

Enviar

↓

Exibir progresso

↓

Download

---

# Upload

Utilizar upload direto para S3.

Nunca enviar arquivos para Lambda.

---

# Download

Download apenas após confirmação do backend.

Nunca montar URL manualmente.

---

# Performance

Lazy Loading.

Code Splitting.

Memoização.

Virtualização quando necessário.

Prefetch de páginas.

---

# Segurança

Nunca armazenar JWT em localStorage se houver alternativa mais segura.

Nunca confiar em dados do cliente.

Sempre validar permissões.

---

# Acessibilidade

Todos os botões devem possuir label.

Todos os inputs devem possuir label.

Suporte ao teclado.

Contraste adequado.

---

# Tailwind

Priorizar classes utilitárias.

Evitar CSS personalizado.

Criar componentes reutilizáveis.

---

# Ícones

Utilizar uma única biblioteca.

Preferencialmente

Lucide React.

---

# Tabelas

Paginação.

Busca.

Ordenação.

Loading.

Estado vazio.

---

# Dashboard

Exibir

Projetos

Créditos

Plano

Histórico

Downloads

Modelos recentes

---

# Página de Geração

Deve possuir

Lista de modelos

Categorias

Parâmetros

Preview

Botão Gerar

Status

Download

---

# Histórico

Permitir

Pesquisar

Duplicar

Editar

Excluir

Download

---

# Configurações

Perfil

Senha

Plano

Pagamento

API Keys

Tema

Idioma

---

# Internacionalização

Preparar estrutura para múltiplos idiomas.

Idioma padrão

Português.

---

# Testes

Utilizar

Vitest

React Testing Library

Toda feature nova deve possuir testes.

---

# Lint

ESLint obrigatório.

Prettier obrigatório.

---

# Build

Build deve finalizar sem

Warnings

Erros

Tipos inválidos

---

# Qualidade

Todo código deve possuir

Tipagem

Componentização

Documentação

Testes

---

# Definition of Done

Uma funcionalidade frontend somente está pronta quando

✓ Responsiva

✓ Tipada

✓ Testada

✓ Documentada

✓ Sem warnings

✓ Sem any

✓ Sem código duplicado

✓ Performance revisada

✓ Acessível

✓ Integrada com backend

---

# Regras para o OpenCode

Sempre criar componentes reutilizáveis.

Sempre separar UI de lógica.

Nunca misturar regras de negócio com componentes visuais.

Sempre utilizar TypeScript corretamente.

Sempre priorizar experiência do usuário.

Sempre reduzir renderizações desnecessárias.

Toda nova tela deve seguir o Design System do projeto.

O frontend do 3DFormio deve ser moderno, rápido, intuitivo e preparado para crescimento sem necessidade de grandes refatorações.
