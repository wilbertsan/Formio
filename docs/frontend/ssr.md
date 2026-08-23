AWS Amplify + Next.js App Router --- Guia para OpenCode

Objetivo

Implementar AWS Amplify Gen 2 em Next.js App Router usando Server
Components, SSR e APIs server-side. Separar código cliente/servidor e
executar APIs Amplify server-side em contexto isolado por requisição.

Stack

Next.js App Router + React + TypeScript.

Amplify JS v6: Next.js >=13.5.0 <16.0.0.

Node.js >=18.17, npm >=9, Git >=2.14.1.

Pacotes: aws-amplify e @aws-amplify/adapter-nextjs.

Amplify Gen 2 usa amplify/ e gera amplify_outputs.json.

npx ampx sandbox é para desenvolvimento, nunca produção.

Instalação

npm add aws-amplify @aws-amplify/adapter-nextjs
npm create next-app@14 -- next-amplify-gen2 --typescript --eslint --app --no-src-dir --no-tailwind --import-alias '@/*'
cd next-amplify-gen2
npm create amplify@latest
npm run dev
npx ampx sandbox

Arquitetura

Browser -> Next.js App Router
  -> Client Components ("use client") -> Amplify client APIs
  -> Server Components / Actions / Route Handlers / Middleware
     -> runWithAmplifyServerContext()
        -> Amplify Auth/Data/Storage server APIs -> AWS

Server Components são padrão no App Router.

APIs server-side devem usar imports /server quando disponíveis.

Não usar APIs client-only em Server Components.

createServerRunner() deve ser chamado uma vez e seu helper
reutilizado.

Configuração server-side

Criar utils/amplifyServerUtils.ts:

import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import outputs from '@/amplify_outputs.json';

export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs
});

Use runWithAmplifyServerContext para executar APIs Amplify em contexto
isolado.

Configuração client-side

Só é necessária quando o browser usa APIs Amplify, como signIn ou
subscriptions:

'use client';
import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';

Amplify.configure(outputs, { ssr: true });
export default function ConfigureAmplifyClientSide() { return null; }

Importe esse componente uma vez no app/layout.tsx. ssr: true permite
que tokens sejam mantidos em cookies e enviados ao servidor Next.js.
Configure Amplify o mais cedo possível.

Server Component: usuário atual

import { cookies } from 'next/headers';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from '@/utils/amplifyServerUtils';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (contextSpec) => getCurrentUser(contextSpec)
  });
  return <p>Hello, {user.username}</p>;
}

Use force-dynamic quando a resposta depender da sessão/request.

Server Component: conteúdo sem sessão

Para APIs sem sessão, nextServerContext pode ser null. Isso é útil
para Storage com acesso guest:

import { getUrl } from 'aws-amplify/storage/server';
import { runWithAmplifyServerContext } from '@/utils/amplifyServerUtils';

const result = await runWithAmplifyServerContext({
  nextServerContext: null,
  operation: (contextSpec) => getUrl(contextSpec, { path: 'public/image.png' })
});

Conteúdo cacheável pode usar export const revalidate = 60 * 60.

Data API no servidor

Para Data/GraphQL no App Router, um cliente baseado em cookies pode ser
centralizado:

import { cookies } from 'next/headers';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';
import { type Schema } from '@/amplify/data/resource';
import outputs from '@/amplify_outputs.json';

export const cookiesClient = generateServerClientUsingCookies<Schema>({
  config: outputs, cookies
});

Use Schema de amplify/data/resource para tipagem.

Middleware: proteger rotas

import { fetchAuthSession } from 'aws-amplify/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { runWithAmplifyServerContext } from '@/utils/amplifyServerUtils';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      try {
        const s = await fetchAuthSession(contextSpec);
        return !!s.tokens?.accessToken && !!s.tokens?.idToken;
      } catch { return false; }
    }
  });
  return authenticated ? response :
    NextResponse.redirect(new URL('/sign-in', request.url));
}
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sign-in).*)']
};

Com response, fetchAuthSession pode enviar tokens renovados via
Set-Cookie.

Server-side Auth + HttpOnly

O fluxo experimental armazena tokens em cookies HttpOnly, inacessíveis
ao JavaScript cliente. Nesse modo, não usar APIs Amplify client-side
para esses tokens.

AMPLIFY_APP_ORIGIN=https://myapp.com

Produção deve usar HTTPS.

Exponha handlers e configure cookies:

export const { runWithAmplifyServerContext, createAuthRouteHandlers } =
  createServerRunner({
    config: outputs,
    runtimeOptions: {
      cookies: { domain: '.myapp.com', sameSite: 'strict', maxAge: 60*60*24*7 }
    }
  });

Rotas de autenticação

app/api/auth/[slug]/route.ts:

import { createAuthRouteHandlers } from '@/utils/amplifyServerUtils';
export const GET = createAuthRouteHandlers({
  redirectOnSignInComplete: '/home',
  redirectOnSignOutComplete: '/sign-in'
});

Rotas: /api/auth/sign-up, /api/auth/sign-in,
/api/auth/sign-in?provider=Google, /api/auth/sign-out,
/api/auth/sign-in-callback, /api/auth/sign-out-callback. Inicie com
links HTML:

<a href="/api/auth/sign-in">Sign In</a>
<a href="/api/auth/sign-up">Sign Up</a>
<a href="/api/auth/sign-in?provider=Google">Google</a>
<a href="/api/auth/sign-out">Sign Out</a>

Auth Resource

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      callbackUrls: ['https://myapp.com/api/auth/sign-in-callback'],
      logoutUrls: ['https://myapp.com/api/auth/sign-out-callback']
    }
  }
});

Os callbacks habilitam o fluxo server-side com Cognito Managed Login.

Helper centralizado

import { cookies } from 'next/headers';
import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { type Schema } from '@/amplify/data/resource';
import outputs from '@/amplify_outputs.json';

export const { runWithAmplifyServerContext } = createServerRunner({ config: outputs });
export const cookiesClient = generateServerClientUsingCookies<Schema>({
  config: outputs, cookies
});
export async function AuthGetCurrentUserServer() {
  try {
    return await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec)
    });
  } catch (error) { console.error(error); }
}

Server Actions / build

Se next build apresentar erro envolvendo
@aws-crypto/sha256-js/@smithy/util-utf8, usar:

const nextConfig = {
  serverComponentsPackages: ['@aws-crypto']
};
export default nextConfig;

Regras para OpenCode

Identifique browser vs servidor antes de escolher a API.

Server Component: aws-amplify/<category>/server +
runWithAmplifyServerContext.

Client Component: 'use client'; configure Amplify com
ssr: true quando necessário.

Não recrie createServerRunner() por requisição.

Contexto cookies/request pertence à requisição atual.

Use force-dynamic quando depender da sessão.

Use revalidate quando o conteúdo puder ser cacheado.

Não use sandbox em produção.

Nunca coloque segredos em código cliente.

Centralize helpers server-side em utils/amplifyServerUtils.ts.

Trate amplify_outputs.json como configuração gerada pelo Amplify.

Estrutura sugerida

app/
  layout.tsx
  page.tsx
  api/auth/[slug]/route.ts
  login/page.tsx
components/
  ConfigureAmplifyClientSide.tsx
  Login.tsx
  Logout.tsx
utils/
  amplifyServerUtils.ts
amplify/
  auth/resource.ts
  data/resource.ts
amplify_outputs.json
middleware.ts
next.config.ts

Referências oficiais

https://docs.amplify.aws/nextjs/frontend/server-side-rendering/

https://docs.amplify.aws/nextjs/frontend/server-side-rendering/nextjs-app-router-server-components/