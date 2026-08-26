# Cadastro / Auth

## Escopo

Fluxos de autenticação do 3DFormio: cadastro, login, confirmação de e-mail, recuperação de senha.

## Status

Feature planejada — hoje a rota `/cadastro` exibe apenas um placeholder.

## Stack

- AWS Amplify UI (`Authenticator` component)
- Cognito (user pools, JWT)
- React Router (rota `/cadastro`)

## Fluxo planejado

1. Usuário acessa `/cadastro`
2. `Authenticator` do Amplify UI gerencia cadastro/login
3. Após login, redireciona para dashboard
4. JWT validado em todas as rotas protegidas

## Decisões

- Amplify UI `Authenticator` como componente de alta ordem (não customizar fluxo básico)
- Rotas protegidas via wrapper de autenticação
- Cognito para gestão de usuários, não solução custom

## Testes

Planejados junto com a implementação.

## Fora de escopo

Landing, studio, ferramentas, backend/banco.
