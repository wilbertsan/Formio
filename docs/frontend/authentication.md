AWS Amplify Auth --- Next.js / OpenCode

Objetivo

Referência para implementar AWS Amplify Gen 2 Auth em Next.js. Use
aws-amplify/auth para APIs e @aws-amplify/ui-react/Authenticator
para UI pronta.

Regras

Configure Amplify com amplify_outputs.json.

Prefira USER_SRP_AUTH: SRP evita enviar a senha ao servidor e é o
fluxo padrão.

Trate signUp/signIn como máquinas de estado: sempre processe
nextStep.

Nunca persista senha, tokens ou secrets no código.

Para recursos protegidos, valide usuário/sessão.

Mudanças de MFA/flows exigem revisão do backend Cognito e frontend.

Remova listeners Hub quando não forem mais necessários.

Authenticator

O Authenticator fornece UI customizável e fluxos completos:

import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import outputs from "../amplify_outputs.json";
Amplify.configure(outputs);
export default function App() {
  return <Authenticator>{({ signOut, user }) => (
    <main><h1>Hello {user?.username}</h1><button onClick={signOut}>Sign out</button></main>
  )}</Authenticator>;
}

Também é possível usar UI própria e controlar os fluxos com
aws-amplify/auth.

Sign-up

import { signUp } from "aws-amplify/auth";
const { isSignUpComplete, userId, nextStep } = await signUp({
  username: "user@example.com", password: "StrongPassword",
  options: { userAttributes: { email: "user@example.com", phone_number: "+5511999999999" } }
});

nextStep: CONFIRM_SIGN_UP → coletar código e confirmSignUp; DONE
→ concluído; COMPLETE_AUTO_SIGN_IN → autoSignIn.

import { confirmSignUp } from "aws-amplify/auth";
await confirmSignUp({ username, confirmationCode });

Por padrão, o usuário fica não confirmado até validar código por
email/telefone. loginWith=phone usa telefone; loginWith=email usa
email; ambos usam email como canal padrão. Passwordless suporta SMS OTP
e Email OTP. Auto sign-in pode ser configurado em signUp com
autoSignIn: { authFlowType: "USER_AUTH" }; após confirmSignUp
retornar COMPLETE_AUTO_SIGN_IN, chame autoSignIn().

Sign-in

import { signIn } from "aws-amplify/auth";
const { nextStep } = await signIn({ username, password });

Estados relevantes: DONE, CONFIRM_SIGN_UP, RESET_PASSWORD,
CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED,
CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE,
CONFIRM_SIGN_IN_WITH_TOTP_CODE, CONFIRM_SIGN_IN_WITH_SMS_CODE,
CONFIRM_SIGN_IN_WITH_EMAIL_CODE, CONFIRM_SIGN_IN_WITH_PASSWORD,
CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION,
CONTINUE_SIGN_IN_WITH_MFA_SELECTION,
CONTINUE_SIGN_IN_WITH_MFA_SETUP_SELECTION,
CONTINUE_SIGN_IN_WITH_TOTP_SETUP, CONTINUE_SIGN_IN_WITH_EMAIL_SETUP.
Desafios usam:

import { confirmSignIn } from "aws-amplify/auth";
await confirmSignIn({ challengeResponse: "123456" });

MFA pode exigir EMAIL, SMS ou TOTP. Email/SMS MFA requerem os
atributos correspondentes; sem atributos adequados, Cognito pode
solicitar TOTP.

Authentication flows

USER_SRP_AUTH: SRP, padrão/recomendado.

USER_PASSWORD_AUTH: credenciais sem SRP; útil para migração via
Cognito Migration Lambda.

CUSTOM_WITH_SRP / CUSTOM_WITHOUT_SRP: desafios customizados.

USER_AUTH: escolha de método.

await signIn({ username, password, options: { authFlowType: "USER_AUTH" } });

USER_AUTH suporta WEB_AUTHN, EMAIL_OTP, SMS_OTP, PASSWORD,
PASSWORD_SRP. Use preferredChallenge quando conhecido; sem ele,
trate CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION e
availableChallenges. Para USER_PASSWORD_AUTH, habilite
explicitamente o fluxo no App Client Cognito. É usado especialmente para
migração de usuários existentes. Fluxos customizados usam triggers
Lambda do Cognito e confirmSignIn para responder desafios.

Sign-out

import { signOut } from "aws-amplify/auth";
await signOut();              // dispositivo/sessão atual
await signOut({ global: true }); // todos os dispositivos

Global sign-out invalida refresh tokens. Access/ID tokens já emitidos em
outros dispositivos podem continuar válidos até expirar; a documentação
informa 1 hora para esses tokens.

Sessões

import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
const { username, userId, signInDetails } = await getCurrentUser();
const session = await fetchAuthSession();
const idToken = session.tokens?.idToken;
const accessToken = session.tokens?.accessToken;

getCurrentUser() lança erro se não houver usuário autenticado.
signInDetails não é suportado com Hosted UI/signInWithRedirect.
fetchAuthSession() atualiza tokens expirados automaticamente quando
existe refresh token; force refresh com:

await fetchAuthSession({ forceRefresh: true });

Sessões de provedores externos não podem, por padrão, ser atualizadas.

User attributes

No cadastro:

userAttributes: { email, phone_number: "+5511999999999", given_name: "Jane", family_name: "Doe", nickname: "Jane" }

Atributos customizados usam custom::

userAttributes: { "custom:display_name": "john_doe123" }

Ler:

import { fetchUserAttributes } from "aws-amplify/auth";
const attributes = await fetchUserAttributes();

Atualizar:

import { updateUserAttribute } from "aws-amplify/auth";
const output = await updateUserAttribute({
  userAttribute: { attributeKey: "given_name", value: "John" }
});

Após atualização, trate output.nextStep: CONFIRM_ATTRIBUTE_WITH_CODE
exige confirmUserAttribute; DONE confirma sucesso.

Auth events

Use Amplify Hub:

import { Hub } from "aws-amplify/utils";
const cancel = Hub.listen("auth", ({ payload }) => {
  switch (payload.event) {
    case "signedIn": break;
    case "signedOut": break;
    case "tokenRefresh": break;
    case "tokenRefresh_failure": break;
    case "signInWithRedirect": break;
    case "signInWithRedirect_failure": break;
    case "customOAuthState": break;
  }
});

O canal auth é protegido; não publique eventos customizados nele.
Eventos são assíncronos e permitem sincronizar UI/estado sem polling.
Chame cancel() ao remover o listener.

Multi-step sign-in

Sempre inspecione nextStep.signInStep. - OTP SMS/email/TOTP →
confirmSignIn({ challengeResponse }). - MFA selection → EMAIL, SMS
ou TOTP. - MFA setup selection → EMAIL ou TOTP. - Email setup →
fornecer email em confirmSignIn. - TOTP setup → apresentar
nextStep.totpSetupDetails.getSetupUri() e confirmar OTP. -
First-factor selection → SMS_OTP, EMAIL_OTP, WEB_AUTHN, PASSWORD
ou PASSWORD_SRP. - Custom challenge → resposta em confirmSignIn. -
New password → nova senha em confirmSignIn. - RESET_PASSWORD →
resetPassword({ username }). - CONFIRM_SIGN_UP → confirmSignUp ou
resendSignUpCode. - DONE → fluxo concluído. Nunca assuma que
signIn() termina em uma chamada.

Delete account

import { deleteUser } from "aws-amplify/auth";
await deleteUser();

deleteUser() também faz sign-out. Com Cognito User Pool, remove o
usuário do User Pool, mas não dados externos. Antes, remova dados
associados em Data/Storage conforme as regras do produto e requisitos
legais. Teste com usuário de teste e informe claramente a exclusão na
UI.

Advanced workflows

Auth events podem disparar lógica por Hub. Para federação avançada,
Amplify aceita credentialsProvider customizado em Amplify.configure.
O provider deve implementar CredentialsAndIdentityIdProvider, obter
identityId/credenciais temporárias via Cognito Identity e implementar
clearCredentialsAndIdentityId(). Fluxo recomendado: validar/renovar
token federado → getId → getCredentialsForIdentity → retornar
accessKeyId, secretAccessKey, sessionToken, expiration,
identityId → limpar credenciais no logout.

OpenCode implementation rules

Use aws-amplify/auth; evite implementar criptografia/autenticação
manual.

Prefira TypeScript e tipos do Amplify.

Centralize loading/error handling.

Nunca exponha secrets no client.

Sempre trate todos os nextStep necessários ao fluxo configurado.

Proteja páginas/ações no contexto apropriado do Next.js.

Não considere atualização de atributo concluída sem tratar
confirmação.

Após global sign-out, considere a validade residual de access/ID
tokens.

Antes de deleteUser, defina a estratégia para dados fora do
Cognito.

Ao usar Hub, remova listeners no cleanup.

Fontes oficiais

https://docs.amplify.aws/nextjs/frontend/auth/

https://docs.amplify.aws/nextjs/frontend/auth/using-the-authenticator/

https://docs.amplify.aws/nextjs/frontend/auth/sign-up/

https://docs.amplify.aws/nextjs/frontend/auth/sign-in/

https://docs.amplify.aws/nextjs/frontend/auth/switching-authentication-flows/

https://docs.amplify.aws/nextjs/frontend/auth/sign-out/

https://docs.amplify.aws/nextjs/frontend/auth/manage-user-sessions/

https://docs.amplify.aws/nextjs/frontend/auth/manage-user-attributes/

https://docs.amplify.aws/nextjs/frontend/auth/listen-to-auth-events/

https://docs.amplify.aws/nextjs/frontend/auth/delete-user-account/

https://docs.amplify.aws/nextjs/frontend/auth/multi-step-sign-in/

https://docs.amplify.aws/nextjs/frontend/auth/advanced-workflows/