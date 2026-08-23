AWS Amplify UI React --- Authenticator

Objetivo

Authenticator é o componente conectado do Amplify UI para React que
fornece fluxos completos de autenticação com pouco código. Ele
integra-se ao backend Amplify/Cognito e disponibiliza login, cadastro,
confirmação, recuperação de senha, MFA, passwordless e acesso ao usuário
autenticado. ## Dependências

npm install @aws-amplify/ui-react aws-amplify

Para usar os estilos padrão:

import '@aws-amplify/ui-react/styles.css';

Com Amplify Gen 1, configure o backend com amplify init,
amplify add auth e, para backend existente, amplify pull. A
configuração deve estar disponível antes de renderizar o
Authenticator. ## Next.js O Amplify UI é interativo e executa no
cliente. Em Next.js App Router, componentes que usam Authenticator
devem ser Client Components e normalmente precisam de "use client". No
Pages Router não há essa exigência adicional. ## Uso básico

import { Authenticator } from '@aws-amplify/ui-react'; export default function App() { return ( <Authenticator> {({ signOut, user }) => ( <main> <h1>Hello {user.username}</h1> <button onClick={signOut}>Sign out</button> </main> )} </Authenticator> ); }

O conteúdo filho é renderizado depois que o usuário conclui a
autenticação e recebe acesso a user e signOut. Também existe
withAuthenticator(App), um HOC que injeta propriedades de
autenticação. O withAuthenticator usa variation="modal" por padrão.
## Estado inicial O padrão para usuários não autenticados é iniciar em
signIn. Use initialState para iniciar em outro fluxo, como signUp
ou forgotPassword.

<Authenticator initialState="signUp" />

Mecanismos de login

O Authenticator pode inferir loginMechanisms automaticamente da
configuração Amplify. Também pode ser definido explicitamente:

<Authenticator loginMechanisms={['email']} /> <Authenticator loginMechanisms={['phone_number']} /> <Authenticator loginMechanisms={['username']} />

username é compatível com Auth Gen 1; login por username não é
suportado em backends Amplify Gen 2. Para Cognito User Pools, o
identificador deve ser username, email ou phone_number, conforme a
configuração do backend. ## Passwordless O Authenticator detecta
métodos passwordless configurados no backend, incluindo: - PASSWORD
--- senha tradicional. - EMAIL_OTP --- código único por e-mail. -
SMS_OTP --- código único por SMS. - WEB_AUTHN --- Passkey/WebAuthn.
Use passwordless para controlar a experiência:

<Authenticator passwordless={{ hiddenAuthMethods: ['PASSWORD'], preferredAuthMethod: 'WEB_AUTHN', passkeyRegistrationPrompts: { afterSignin: 'ALWAYS', afterSignup: 'ALWAYS' } }} />

hiddenAuthMethods remove métodos da seleção; preferredAuthMethod
pode pular a seleção; passkeyRegistrationPrompts controla os prompts
após login/cadastro. Passkey depende de navegador com suporte à WebAuthn
API. ## Atributos de cadastro signUpAttributes pode ser inferido
automaticamente da configuração Amplify ou definido explicitamente.

<Authenticator signUpAttributes={['email', 'given_name', 'family_name', 'phone_number']} />

Atributos Cognito comuns incluem address, birthdate, email,
family_name, gender, given_name, locale, middle_name, name,
nickname, phone_number, picture, preferred_username, profile,
updated_at, website e zoneinfo. Mesmo com signUpAttributes={[]},
atributos necessários para verificação, como email, podem continuar
sendo exigidos. ## Social providers Os provedores sociais podem ser
inferidos ou definidos explicitamente:

<Authenticator socialProviders={['amazon', 'apple', 'facebook', 'google']} />

Eles precisam estar configurados no backend. ## Variações A variação
padrão exibe um card centralizado. variation="modal" cria um
Authenticator sobreposto à tela:

<Authenticator variation="modal" />

Para impedir novos cadastros, use:

<Authenticator hideSignUp />

Com HOC:

withAuthenticator(App, { hideSignUp: true });

Customização por slots

Use components para substituir headers e footers globais ou
específicos de cada tela. Telas/slots comuns incluem Header, Footer,
SignIn, SignUp, ConfirmSignUp, SetupTotp, ConfirmSignIn,
ForgotPassword, ConfirmResetPassword, SelectMfaType e
SetupEmail.

const components = { Header() { return <h2>Minha aplicação</h2>; }, Footer() { return <small>© Minha Empresa</small>; }, SignIn: { Header() { return <h3>Entre na sua conta</h3>; }, Footer() { return <a href="/help">Ajuda</a>; } } }; <Authenticator components={components} />

Campos de formulário

Use formFields para alterar label, placeholder, labelHidden,
isRequired, order, dialCode e dialCodeList.

const formFields = { signIn: { username: { label: 'E-mail', placeholder: 'Digite seu e-mail', isRequired: true, labelHidden: false } }, signUp: { given_name: { label: 'Nome', order: 1 }, email: { label: 'E-mail', order: 2 }, password: { label: 'Senha', order: 3 } } }; <Authenticator formFields={formFields} />

Importante: ao especificar um campo em formFields, os atributos padrão
desse campo são sobrescritos; reespecifique os valores padrão
necessários. A validação do cliente pode seguir os padrões de validação
HTML. Na tela de Sign In, o nome do campo é username mesmo quando o
mecanismo utiliza e-mail ou telefone. ## Campos disponíveis signIn:
username, password. signUp: email, phone_number, username,
password, confirm_password, preferred_username, birthdate,
family_name, middle_name, given_name, name, nickname,
profile, website e atributos customizados. confirmSignUp:
confirmation_code. forgotPassword: username.
confirmResetPassword: confirmation_code, password,
confirm_password. forceNewPassword: password, confirm_password.
setupTotp: confirmation_code. confirmSignIn: confirmation_code.
confirmVerifyUser: confirmation_code. setupEmail: email. ##
Telefone Defina o código internacional padrão com dialCode e limite as
opções com dialCodeList:

const formFields = { signUp: { phone_number: { dialCode: '+55', dialCodeList: ['+55', '+1', '+351'] } } };

Os valores de dialCodeList devem conter o sinal +. ## Ordem dos
campos Use order para controlar a ordem da tela de cadastro. Campos
sem order aparecem no final.

const formFields = { signUp: { email: { order: 1 }, family_name: { order: 2 }, given_name: { order: 3 }, password: { order: 4 }, confirm_password: { order: 5 } } };

TOTP

O emissor e o username apresentados no aplicativo autenticador podem ser
personalizados:

const formFields = { setupTotp: { QR: { totpIssuer: 'Minha Aplicação', totpUsername: 'usuario' } } };

Os padrões são AWSCognito para issuer e user.username para username.
## Sobrescrever chamadas de Auth A propriedade services permite
interceptar chamadas como signUp, signIn, confirmSignIn,
confirmSignUp, resendSignUpCode e recuperação de senha. No Amplify
UI v6, as funções de Auth são importadas diretamente de
aws-amplify/auth:

import { signUp } from 'aws-amplify/auth'; const services = { async handleSignUp(input) { const { username, password, options } = input; return signUp({ username: username.toLowerCase(), password, options }); } }; <Authenticator services={services} />

No v5 e anteriores, APIs legadas usam Auth e a recuperação de senha
utiliza forgotPassword/forgotPasswordSubmit. No v6, o fluxo
correspondente utiliza resetPassword conforme a API atual. ##
Internacionalização O Authenticator possui traduções para diversos
idiomas, incluindo inglês, português, espanhol, francês, alemão,
italiano, japonês, coreano, chinês, holandês, hebraico, húngaro,
indonésio, norueguês, polonês, russo, sueco, tailandês, turco e
ucraniano. No Amplify JS v6:

import { I18n } from 'aws-amplify/utils'; import { translations } from '@aws-amplify/ui-react'; I18n.putVocabularies(translations); I18n.setLanguage('pt');

Também é possível substituir textos específicos:

I18n.putVocabulariesForLanguage('pt', { 'Sign In': 'Entrar', 'Sign Up': 'Criar conta', Password: 'Senha' });

Tema e CSS

É possível estilizar com CSS variables, classes amplify-* ou
ThemeProvider.

import { Authenticator, ThemeProvider, Theme } from '@aws-amplify/ui-react'; const theme: Theme = { name: 'app-theme', tokens: { components: { authenticator: { router: { borderWidth: '0' }, form: { padding: '1rem 2rem' } } } } }; <ThemeProvider theme={theme}> <Authenticator /> </ThemeProvider>

Também é possível alterar variáveis como
--amplify-components-authenticator-router-box-shadow,
--amplify-components-authenticator-router-border-width,
--amplify-components-authenticator-form-padding e variáveis de botão,
tabs e field controls. Classes amplify-* podem ser sobrescritas quando
necessário. ## Passwordless: estilo ## Advanced Usage Para acessar o
estado do Authenticator fora do componente, use
Authenticator.Provider:

import { Authenticator } from '@aws-amplify/ui-react'; export default function App() { return ( <Authenticator.Provider> <AppContent /> </Authenticator.Provider> ); }

Dentro da árvore:

import { useAuthenticator } from '@aws-amplify/ui-react'; const Home = () => { const { user, signOut } = useAuthenticator(context => [context.user]); return ( <> <h1>Olá {user.username}</h1> <button onClick={signOut}>Sair</button> </> ); };

useAuthenticator foi projetado para uso com o Authenticator
renderizado e não deve ser utilizado isoladamente sem a infraestrutura
correspondente. ## Evitar re-renderizações No useAuthenticator,
prefira um seletor que retorne somente os valores necessários:

const { user } = useAuthenticator(context => [context.user]);

Isso evita re-renderizações quando outros valores do contexto mudarem.
Usar o hook no nível superior da aplicação sem seletor pode provocar
re-renderizações em toda a árvore. ## Estado de autenticação
authStatus possui: - configuring - authenticated -
unauthenticated Use-o quando a aplicação só precisa saber se existe
uma sessão válida:

const { authStatus } = useAuthenticator(context => [context.authStatus]); return ( <> {authStatus === 'configuring' && 'Loading...'} {authStatus === 'authenticated' ? <Home /> : <Authenticator />} </> );

Rotas do Authenticator

route representa o fluxo atual e pode assumir estados como idle,
setup, signIn, signUp, confirmSignIn, confirmSignUp,
selectMfaType, setupEmail, setupTotp, forceNewPassword,
forgotPassword, confirmResetPassword, verifyUser,
confirmVerifyUser, signOut e authenticated.

const { route } = useAuthenticator(context => [context.route]); return route === 'authenticated' ? <Home /> : <Authenticator />;

Usuário autenticado

user contém o usuário atual; quando não há usuário autenticado, seu
valor é undefined.

const { user, signOut } = useAuthenticator(context => [context.user]);

Transições

useAuthenticator disponibiliza funções para mudar de fluxo. Exemplos:
toSignIn, toSignUp e toForgotPassword. Transições inválidas são
ignoradas.

const { toForgotPassword } = useAuthenticator(); <button onClick={toForgotPassword}>Esqueci minha senha</button>

Transições comuns: - toSignIn() --- retorna ao login. - toSignUp()
--- vai para cadastro quando permitido. - toForgotPassword() --- abre
recuperação de senha. ## Contexto completo O hook pode fornecer user,
route, error, validationErrors, hasValidationErrors,
isPending, codeDeliveryDetail e allowedMfaTypes. ## Regras para o
projeto 1. Preferir configuração automática do Amplify quando ela
atender ao requisito. 2. Usar loginMechanisms, passwordless,
signUpAttributes, socialProviders, formFields, components e
services somente quando houver necessidade explícita. 3. Manter toda
lógica de autenticação baseada nas APIs atuais do Amplify. 4. Em Next.js
App Router, manter componentes do Authenticator no lado cliente. 5. Para
useAuthenticator, usar Authenticator.Provider quando o estado
precisar estar disponível fora da árvore direta do componente. 6. Usar
seletores no useAuthenticator para reduzir re-renderizações. 7.
Preferir ThemeProvider/tokens para identidade visual consistente e CSS
variables para ajustes pontuais. 8. Não duplicar manualmente fluxos que
o Authenticator já fornece. 9. Ao personalizar formFields, lembrar que
a configuração do campo substitui os defaults. 10. Não assumir que
passwordless está disponível sem configuração correspondente no backend.
## Fontes oficiais -
https://ui.docs.amplify.aws/react/connected-components/authenticator -
https://ui.docs.amplify.aws/react/connected-components/authenticator/configuration -
https://ui.docs.amplify.aws/react/connected-components/authenticator/customization -
https://ui.docs.amplify.aws/react/connected-components/authenticator/advanced