AWS Blocks + Amplify Gen 2 — Guia para OpenCode

Objetivo

AWS Blocks adiciona capacidades de backend autocontidas e composáveis a um projeto Amplify Gen 2 existente. Blocks usa AWS CDK, pode executar localmente sem conta AWS e é implantado junto com o backend Amplify. Pode fornecer APIs, armazenamento, agentes de IA, autenticação, PostgreSQL, realtime, métricas e logging.

Pré-requisitos

Projeto Amplify Gen 2 existente com amplify/backend.ts.

Node.js 22+ e npm 10+.

Para Agent: acesso ao modelo Amazon Bedrock habilitado na conta/região.

Para integração com Cognito: Amplify Auth configurado.

Adicionar AWS Blocks

Na raiz do projeto:

npx @aws-blocks/create-blocks-app

O CLI detecta amplify/backend.ts e integra Blocks ao projeto existente. Não faça o wiring manualmente.
Arquivos principais gerados/modificados:

aws-blocks/: workspace do backend Blocks; APIs, auth e dados ficam em aws-blocks/index.ts.

amplify/blocks.ts: integra Blocks ao backend Amplify e encaminha configuração Cognito para a Lambda.

amplify/backend.ts: importa ./blocks e chama initBlocks(backend).

package.json: adiciona workspace aws-blocks, dependências e scripts sandbox, sandbox:delete e blocks:generate-client.

amplify.yml: adiciona NODE_OPTIONS="--conditions=cdk" ao build hospedado.
O CLI não faz commit das alterações; revise o diff antes de commitar.

Integração interna

amplify/blocks.ts cria uma stack CDK aninhada:

const blocksStack = backend.createStack('blocks');
const sandboxMode = process.env.AMPLIFY_SANDBOX === 'true';
const blocks = await createBlocksBackend(blocksStack, sandboxMode);

A stack contém o backend Blocks, incluindo Lambda e endpoint da API. Como é nested stack do Amplify, o mesmo ampx/CloudFormation implanta Amplify e Blocks; não existe segundo deploy separado.
A integração pode encaminhar Cognito:

if (backend.auth?.resources?.cfnResources) {
  const { cfnUserPool, cfnUserPoolClient } = backend.auth.resources.cfnResources;
  blocks.handler.addEnvironment('COGNITO_USER_POOL_ID', cfnUserPool.ref);
  blocks.handler.addEnvironment('COGNITO_CLIENT_ID', cfnUserPoolClient.ref);
  blocks.handler.addEnvironment('COGNITO_REGION', blocksStack.region);
}
backend.addOutput({ custom: { blocks_api_url: blocks.apiUrl } });

Implementações por ambiente

Blocks usa conditional exports do Node.js:

Desenvolvimento local: implementações em memória/filesystem; não exige conta AWS.

Síntese CDK: --conditions=cdk; o script sandbox e amplify.yml configuram isso.

Runtime AWS: --conditions=aws-runtime; usa SDK AWS dentro da Lambda.
Assim, uma mesma declaração de Block pode usar armazenamento local no desenvolvimento e serviços AWS após deploy, sem alterar o código.

Definir um Block

Exemplo mínimo em aws-blocks/index.ts:

import { ApiNamespace, Scope } from '@aws-blocks/blocks';
import { KVStore } from '@aws-blocks/bb-kv-store';
import { CognitoVerifier } from './cognito-verifier.js';

const scope = new Scope('my-app');
const store = new KVStore(scope, 'notes', {});
const auth = new CognitoVerifier({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  tokenUse: 'id'
});
export const api = new ApiNamespace(scope, 'api', (context) => ({
  async greet(name: string) {
    return { message: `Hello from Blocks, ${name}!`, timestamp: Date.now() };
  },
  async putNote(key: string, value: string) {
    const user = await auth.requireAuth(context);
    await store.put(`${user.sub}:${key}`, value);
    return { success: true };
  },
  async getNote(key: string) {
    const user = await auth.requireAuth(context);
    return { value: await store.get(`${user.sub}:${key}`) };
  }
}));

Operações públicas não precisam de autenticação. Operações protegidas devem chamar requireAuth(context) e, quando armazenarem dados por usuário, usar um identificador derivado do usuário autenticado.

Deploy

npm run sandbox

Esse comando executa ampx sandbox com as condições CDK, sintetiza Amplify + Blocks e grava a URL da API em amplify_outputs.json como custom.blocks_api_url.

Cliente frontend

Após o deploy:

npm run blocks:generate-client

O comando gera aws-blocks/client.js. O cliente tipado lê custom.blocks_api_url de amplify_outputs.json e registra middleware que obtém o ID token atual via fetchAuthSession() e envia Authorization: Bearer <token>.
Regere o cliente sempre que a superfície da API mudar em aws-blocks/index.ts.
A aplicação deve executar Amplify.configure(outputs) durante o startup.
Exemplo:

import { api } from 'aws-blocks';

const result = await api.greet('world');
await api.putNote('draft', 'Buy milk');
const note = await api.getNote('draft');

Autenticação Cognito

Blocks não cria um segundo User Pool. Ele reutiliza o Cognito criado pelo Amplify. CognitoVerifier valida de forma stateless os tokens emitidos pelo Amplify. requireAuth(context) deve ser usado antes de acessar dados ou operações privadas; token ausente/inválido resulta em HTTP 401.

AI Agent + Amazon Bedrock

Instale no workspace aws-blocks:

npm install @aws-blocks/bb-agent zod

zod v4 é peer dependency para validação de parâmetros de ferramentas.
Defina o agente:

import { ApiNamespace, Scope } from '@aws-blocks/blocks';
import { Agent, BedrockModels } from '@aws-blocks/bb-agent';
import { CognitoVerifier } from './cognito-verifier.js';

const scope = new Scope('my-app');
const auth = new CognitoVerifier({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  tokenUse: 'id'
});
const agent = new Agent(scope, 'support-agent', {
  model: { deployed: BedrockModels.BALANCED },
  systemPrompt: 'You are a helpful support agent.'
});
export const api = new ApiNamespace(scope, 'api', (context) => ({
  async createConversation() {
    const user = await auth.requireAuth(context);
    return { conversationId: await agent.createConversationId(user.sub) };
  },
  async sendMessage(conversationId: string, message: string, channelId: string) {
    const user = await auth.requireAuth(context);
    await agent.stream(message, { conversationId, channelId, userId: user.sub });
  },
  async getConversation(conversationId: string) {
    const user = await auth.requireAuth(context);
    const owned = await agent.listConversations(user.sub);
    if (!owned.some(c => c.conversationId === conversationId)) throw new Error('Not found');
    return { messages: await agent.getConversation(conversationId) };
  },
  async getChannel(channelId: string) {
    return agent.getChannel(channelId);
  }
}));

O Agent persiste conversas, transmite respostas por canal Realtime e autentica chamadas usando o Cognito existente. conversationId é não previsível, mas não substitui autorização. Sempre valide que a conversa pertence ao usuário antes de devolver histórico.
Deploy:

npm run sandbox

Habilite model access para o modelo Bedrock escolhido na conta/região.
No frontend, gere novamente o cliente e use useChat:

import { api } from 'aws-blocks';
import { useChat } from '@aws-blocks/bb-agent/client';

const chat = useChat({
  api: {
    sendMessage: (id, message, channelId) => api.sendMessage(id, message, channelId),
    createConversation: () => api.createConversation(),
    getConversation: id => api.getConversation(id)
  },
  subscribe: async (channelId, handler) => {
    const channel = await api.getChannel(channelId);
    return channel.subscribe(handler);
  },
  onMessagesChange: msgs => renderMessages(msgs)
});
await chat.sendMessage('Hello');

Apesar do nome, useChat é uma factory function, não um React Hook; inicialize uma vez, não em cada render.

BasicAuth

AuthBasic oferece username/password com sessões JWT/cookie e é indicado para protótipos, ferramentas internas e MVPs. Para produção, prefira o Cognito existente do Amplify. BasicAuth não substitui Amplify Auth.
Instale:

npm install @aws-blocks/bb-auth-basic

Configure:

import { ApiNamespace, Scope } from '@aws-blocks/blocks';
import { AuthBasic } from '@aws-blocks/bb-auth-basic';

const scope = new Scope('my-app');
const auth = new AuthBasic(scope, 'auth', {
  sessionDuration: 86400,
  passwordPolicy: { minLength: 8, requireDigits: true }
});
export const api = new ApiNamespace(scope, 'api', (context) => ({
  async getProfile() {
    const user = await auth.requireAuth(context);
    return { username: user.username, createdAt: user.createdAt };
  }
}));
export const authApi = auth.createApi();

requireAuth(context) retorna o usuário ou lança 401/SessionExpiredException. AuthBasic gerencia a sessão com cookie HTTP, portanto não é necessário anexar token manualmente.
Deploy e cliente:

npm run sandbox
npm run blocks:generate-client

Frontend:

import { api, authApi } from 'aws-blocks';

await authApi.setAuthState({
  action: 'signUp',
  username: 'alice',
  password: 'strong-password'
});
await authApi.setAuthState({
  action: 'signIn',
  username: 'alice',
  password: 'strong-password'
});
const profile = await api.getProfile();

setAuthState não lança erro para credenciais inválidas: retorna novo estado com errorName. Use hasAuthError e AuthBasicErrors.InvalidCredentials.
Para confirmação por código, configure codeDelivery(username, code). O usuário fica não confirmado até informar o código de 6 dígitos; isso também habilita recuperação de senha. O código pode ser entregue pelo EmailClient Block. Confirmação usa { action: 'confirmSignUp', username, code, password }.

Regras para OpenCode

Não crie uma segunda infraestrutura de autenticação se Amplify Auth/Cognito já estiver presente; reutilize CognitoVerifier.

Não hardcode a URL da Blocks API; use amplify_outputs.json/cliente gerado.

Execute npm run blocks:generate-client após mudanças na API.

Use requireAuth(context) em toda operação protegida.

Para histórico de Agent, confirme explicitamente que conversationId pertence ao usuário autenticado.

Não trate useChat como React Hook.

Não altere manualmente o wiring gerado sem necessidade; mantenha amplify/blocks.ts como ponto de integração.

Para deploy, use o fluxo Amplify (npm run sandbox); Blocks é parte da mesma implantação.

Para Agent, confirme acesso ao modelo Bedrock na conta e região.

Use BasicAuth principalmente em protótipos/MVPs quando Cognito não for necessário.

Fluxo recomendado

Confirmar Amplify Gen 2 + Node 22.

Executar npx @aws-blocks/create-blocks-app.

Definir Blocks em aws-blocks/index.ts.

Revisar alterações geradas.

Executar npm run sandbox.

Executar npm run blocks:generate-client.

Integrar api no frontend.

Testar autenticação, autorização, dados e, se usado, streaming do Agent.

Commitar somente após revisar o diff.

Referências oficiais

https://docs.amplify.aws/nextjs/build-a-backend/aws-blocks/

https://docs.amplify.aws/nextjs/build-a-backend/aws-blocks/get-started/

https://docs.amplify.aws/nextjs/build-a-backend/aws-blocks/how-it-works/

https://docs.amplify.aws/nextjs/build-a-backend/aws-blocks/connect-your-frontend/

https://docs.amplify.aws/nextjs/build-a-backend/aws-blocks/add-an-agent/

https://docs.amplify.aws/nextjs/build-a-backend/aws-blocks/use-basic-auth/