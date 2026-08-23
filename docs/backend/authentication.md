AWS Amplify Gen 2 Auth — Guia do Projeto (Next.js)

Objetivo

Implementar autenticação e autorização com AWS Amplify Gen 2 para aplicações Next.js. O Amplify Auth usa Amazon Cognito para cadastro, login, recuperação de conta, MFA, federação e gerenciamento de identidades. O backend é definido em TypeScript e provisionado com AWS CDK.

Arquitetura

Amplify Auth → Amazon Cognito.

Cognito User Pool: diretório de usuários, cadastro, autenticação e recuperação de conta.

Cognito Identity Pool: fornece identidades/credenciais IAM para acesso a outros serviços AWS.

AuthN (Authentication): valida quem é o usuário.

AuthZ (Authorization): determina o que o usuário pode acessar.

Frontend usa aws-amplify e a configuração gerada em amplify_outputs.json.

Backend fica principalmente em amplify/auth/resource.ts; customizações avançadas podem usar amplify/backend.ts + CDK.

Configuração básica

Arquivo: amplify/auth/resource.ts

import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});

Por padrão, o mecanismo de login pode ser email + senha. Também podem ser configurados telefone, provedores externos (Google, Facebook, Amazon e Sign in with Apple) e autenticação passwordless.
Após definir o recurso:

npx ampx sandbox

O sandbox provisiona os recursos e gera amplify_outputs.json, usado pelo frontend para configurar a conexão com o backend.

Estratégia de login

loginWith deve definir como os usuários entram na aplicação. Opções relevantes:

Email.

Número de telefone.

Provedores externos/federação.

Passwordless: email OTP, SMS OTP e WebAuthn/passkeys.
Exemplo de email OTP:

export const auth = defineAuth({
  loginWith: {
    email: { otpLogin: true },
  },
});

Segurança e conceitos

Fortalecer autenticação pode envolver:

Política de senha mais forte.

Atributos de contato necessários para recuperação.

MFA.

Federação com provedores externos.
MFA aumenta a segurança, mas pode adicionar fricção ao login. Federação simplifica o acesso, porém envolve compartilhamento de dados com terceiros.
User Pool e Identity Pool têm papéis diferentes: User Pool autentica e gerencia usuários; Identity Pool autoriza acesso a recursos AWS mediante identidades/roles IAM.

Recursos de autenticação

O projeto deve considerar:

Usuários, atributos e grupos.

Sessões, tokens e credenciais.

MFA.

External Identity Providers.

Guest access.

Passwordless.

WebAuthn/passkeys.

Gerenciamento de dispositivos.

Recuperação e alteração de senha.

Exclusão da conta.

Eventos do ciclo de autenticação.

Gerenciamento de usuários

O Amplify/Cognito permite operações administrativas e de usuário. Para administração, utilizar ações específicas no backend e evitar expor permissões administrativas diretamente ao navegador.
Casos comuns:

Criar, confirmar, habilitar, desabilitar e excluir usuários.

Atualizar atributos.

Gerenciar grupos e associação de usuários.

Gerenciar dispositivos.

Resetar ou alterar senha.

Gerenciar WebAuthn.

Logout global.
O Amplify Console também pode ser usado para administrar usuários e grupos do Cognito.

Ciclo de autenticação

O lifecycle pode ser customizado com:

Customização de emails.

Cognito Lambda triggers.
Use triggers quando for necessário executar lógica de negócio durante etapas do ciclo de usuário, por exemplo validações, criação de perfil, mensagens personalizadas ou alterações controladas de atributos/claims.
Mantenha lógica crítica no backend e aplique menor privilégio.

Exemplos

Um caso documentado é Microsoft Entra ID via SAML. A federação permite integrar um provedor corporativo externo ao Cognito.
Outros padrões úteis incluem:

Adicionar usuário a grupo via função.

Criar perfil de usuário.

Validar atributos.

Personalizar mensagens.

Alterar claims do token.

Custom Auth Challenge.

Integração com serviços AWS por funções/triggers.

Acesso de funções ao Auth

O recurso auth possui access, permitindo que outros recursos executem ações autorizadas sobre Cognito.

export const auth = defineAuth({
  loginWith: { email: true },
  access: (allow) => [
    allow.resource(addUserToGroup).to(["addUserToGroup"]),
  ],
});

Ao conceder acesso a uma função, o Amplify configura variáveis de ambiente tipadas para permitir chamadas SDK aos serviços autorizados.
Ações relevantes:

manageUsers: CRUD administrativo de usuários.

manageGroupMembership: adicionar/remover usuários de grupos.

manageGroups: CRUD de grupos.

manageUserDevices: administrar dispositivos.

managePasswordRecovery: recuperação/alteração administrativa de senha.

addUserToGroup: adicionar usuário a grupo.
Conceder somente as ações necessárias à função.

Customização com CDK

Amplify fornece defaults para Cognito, mas permite acessar recursos L1 via CDK:

import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";

const backend = defineBackend({ auth });
const { cfnUserPool } = backend.auth.resources.cfnResources;

cfnUserPool.policies = {
  passwordPolicy: {
    minimumLength: 10,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    requireUppercase: true,
    temporaryPasswordValidityDays: 20,
  },
};

Produção

O Auth provisionado por padrão possui capacidade limitada para envio de emails/SMS e é adequado principalmente ao desenvolvimento.
Para produção:

Configurar email com Amazon SES.

Verificar domínio/endereço remetente.

Solicitar acesso de produção do SES quando a conta estiver em sandbox.

Definir remetente verificado no defineAuth.
Exemplo:

export const auth = defineAuth({
  loginWith: { email: true },
  senders: {
    email: {
      fromEmail: "registrations@example.com",
    },
  },
});

Cognito existente

É possível usar um User Pool e Identity Pool existentes.
Sem backend Amplify, configure o cliente diretamente:

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "<user-pool-id>",
      userPoolClientId: "<client-id>",
      identityPoolId: "<identity-pool-id>",
      loginWith: { email: true },
      signUpVerificationMethod: "code",
      userAttributes: { email: { required: true } },
      allowGuestAccess: true,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
  },
});

A referência exige User Pool, User Pool Client, Identity Pool e roles IAM autenticada/não autenticada configuradas no Identity Pool.

API de frontend

A biblioteca de Auth expõe operações para:

signUp, confirmSignUp

signIn, confirmSignIn

signOut

fetchAuthSession

getCurrentUser

updateUserAttributes, deleteUserAttributes, confirmUserAttribute

resetPassword, confirmResetPassword

updatePassword

deleteUser

fetchUserAttributes

fetchMFAPreference, updateMFAPreference

setUpTOTP, verifyTOTPSetup

fetchDevices, rememberDevice, forgetDevice

Operações WebAuthn

Decodificação de JWT
Erros devem ser tratados explicitamente, especialmente erros de validação, configuração de tokens e exceções retornadas pelo Cognito.

Tokens e autorização

Tokens JWT representam a sessão/autenticação e podem carregar claims usados para autorização. Não confiar apenas em dados controlados pelo cliente.
Para dados/API, combinar autenticação com regras de autorização no backend. Para operações administrativas de Cognito, preferir funções server-side com IAM mínimo.

Regras para o OpenCode

Preferir Amplify Gen 2 e TypeScript.

Manter autenticação em amplify/auth/resource.ts.

Não colocar credenciais AWS ou secrets no frontend.

Não conceder permissões administrativas de Cognito ao cliente.

Usar access para conceder ações específicas a funções.

Preferir defineAuth antes de CDK overrides.

Usar referenceAuth quando Cognito já existir e não puder ser recriado.

Validar configuração de produção antes do deploy.

Tratar erros de Auth explicitamente.

Manter autorização no backend; autenticação do usuário não implica autorização para todos os recursos.

Usar amplify_outputs.json gerado pelo Amplify; não hardcodear IDs quando o projeto puder obtê-los da configuração.

Para mudanças de infraestrutura, considerar dependências entre Cognito, Identity Pool, IAM e funções.

Fluxo recomendado

Criar/configurar amplify/auth/resource.ts.

Escolher método de login.

Configurar atributos, MFA, grupos e passwordless conforme necessidade.

Executar npx ampx sandbox.

Integrar o frontend com aws-amplify.

Implementar signup/signin/signout e recuperação.

Definir autorização para dados e funções.

Conceder acesso Cognito somente às funções que precisam.

Customizar lifecycle apenas quando necessário.

Validar segurança e observabilidade.

Configurar SES/SMS e demais requisitos de produção.

Fazer deploy e testar fluxos de cadastro, login, MFA, recuperação, autorização e logout.

Fontes oficiais

https://docs.amplify.aws/nextjs/build-a-backend/auth/

https://docs.amplify.aws/nextjs/build-a-backend/auth/set-up-auth/

https://docs.amplify.aws/nextjs/build-a-backend/auth/concepts/

https://docs.amplify.aws/nextjs/build-a-backend/auth/manage-users/

https://docs.amplify.aws/nextjs/build-a-backend/auth/customize-auth-lifecycle/

https://docs.amplify.aws/nextjs/build-a-backend/auth/examples/

https://docs.amplify.aws/nextjs/build-a-backend/auth/grant-access-to-auth-resources/

https://docs.amplify.aws/nextjs/build-a-backend/auth/modify-resources-with-cdk/

https://docs.amplify.aws/nextjs/build-a-backend/auth/moving-to-production/

https://docs.amplify.aws/nextjs/build-a-backend/auth/use-existing-cognito-resources/

https://docs.amplify.aws/nextjs/build-a-backend/auth/reference/