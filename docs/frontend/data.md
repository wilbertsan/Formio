AWS Amplify Gen 2 Data — Guia para OpenCode

Objetivo

Integrar Next.js ao Amplify Gen 2 Data usando clientes tipados, autorização explícita, queries, mutations, real-time, UI otimista e acesso server-side. Fonte oficial: documentação AWS Amplify Data para Next.js.

Referências

https://docs.amplify.aws/nextjs/frontend/data/

https://docs.amplify.aws/nextjs/frontend/data/connect-to-API/

https://docs.amplify.aws/nextjs/frontend/data/query-data/

https://docs.amplify.aws/nextjs/frontend/data/mutate-data/

https://docs.amplify.aws/nextjs/frontend/data/subscribe-data/

https://docs.amplify.aws/nextjs/frontend/data/optimistic-ui/

https://docs.amplify.aws/nextjs/frontend/data/custom-subscription/

https://docs.amplify.aws/nextjs/frontend/data/connect-from-server-runtime/

1. Configuração

Pré-requisitos: backend Data ativo, Next.js com Amplify instalado, amplify_outputs.json gerado e schema em amplify/data/resource.ts.

import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';
Amplify.configure(outputs);

Cliente tipado:

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
const client = generateClient<Schema>();

O cliente fornece CRUDL tipado para os modelos do schema.

2. Autorização

authMode define como a chamada será autorizada:

userPool: Cognito User Pool; allow.authenticated(), allow.owner(), grupos etc.

apiKey: modelos com allow.publicApiKey().

identityPool: allow.guest() ou allow.authenticated('identityPool').

oidc: provedor OIDC confiável.

lambda: autorização customizada com token.
Definir no cliente: generateClient<Schema>({ authMode: 'userPool' }).
Ou por request: client.models.Todo.list({ authMode: 'apiKey' }).
Respeitar o modo padrão de amplify_outputs.json e as regras do schema. Não expor secrets no browser.

3. Headers e endpoint adicional

Headers podem existir no cliente ou por request; podem ser estáticos ou uma função assíncrona baseada em método, URI, query string e headers, útil para assinaturas.

const client = generateClient<Schema>({
  headers: { 'My-Custom-Header': 'my value' }
});

Endpoint adicional:

const client = generateClient({
  endpoint: 'https://my-other-endpoint.com/graphql',
  authMode: 'userPool'
});

Para API Key, informar apiKey; para outro mecanismo, usar headers customizados.

4. Queries

Amplify cria list e get automaticamente para cada a.model().

const { data: todos, errors } = await client.models.Todo.list();
const { data: todo, errors } = await client.models.Todo.get({ id });

Filtros são server-side e aceitam lógica recursiva and, or, not e operadores de campo:

const { data, errors } = await client.models.Todo.list({
  filter: { content: { beginsWith: 'hello' } }
});

List queries possuem paginação. Para grandes volumes, usar cursores/páginas em vez de carregar tudo.
selectionSet permite solicitar apenas os campos necessários e reduzir payload.
Requests podem ser cancelados quando necessário.

5. Mutations

Criar:

const { data, errors } = await client.models.Todo.create({
  content: 'My new todo',
  isDone: true
});

createdAt e updatedAt são preenchidos automaticamente.
Atualizar:

const { data, errors } = await client.models.Todo.update({
  id: todoId,
  content: 'Updated todo'
});

Excluir: client.models.Todo.delete({ id: todoId }).
authMode pode ser passado no segundo argumento de create/update/delete.
Mutations podem ser canceladas usando o objeto Promise retornado pela operação e client.isCancelError(error) para identificar cancelamento.
Erros unauthorized normalmente exigem revisão das authorization rules e do authMode.

6. Real-time

Modelos a.model() possuem onCreate, onUpdate e onDelete.

const sub = client.models.Todo.onCreate({
  filter: { content: { contains: 'groceries' } }
}).subscribe({
  next: data => console.log(data),
  error: error => console.warn(error)
});

Sem filter, recebe eventos autorizados. Evitar filtro {}.
Sempre chamar sub.unsubscribe() no cleanup.
Dynamic group authorization tem limites: até 5 grupos quando a autorização usa um único grupo por registro; com array de grupos, até 20 grupos do usuário e 20 grupos por registro.

7. observeQuery

Para listas sincronizadas em tempo real, preferir observeQuery.

const sub = client.models.Todo.observeQuery().subscribe({
  next: ({ items, isSynced }) => setTodos([...items])
});

observeQuery busca/pagina dados da nuvem e emite snapshots. Durante sincronização isSynced=false; ao concluir, true.
Em React, criar no useEffect e retornar sub.unsubscribe().

8. Selection set e autorização real-time

Eventos dependem de autorização:

onCreate: read ou listen

onUpdate: read ou listen

onDelete: read ou listen

observeQuery: read ou (listen + list)
Todos os campos esperados em um evento precisam estar no selection set da mutation que o dispara.
Para consistência, compartilhar um selection set:

const selectionSet = ['title', 'author', 'posts.*'] as const;

Use o mesmo conjunto na subscription e na mutation.
Mutations em modelos relacionados não atualizam automaticamente subscriptions do modelo pai. Se Post mudar, uma subscription de Blog não deve ser usada para detectar a mudança.
Campos relacionais podem ser redigidos como null/vazios quando regras de autorização diferentes impedirem garantir acesso. Nesse caso, consultar novamente os dados relacionados autorizados.

9. Estado da conexão

Usar Hub para acompanhar CONNECTION_STATE_CHANGE:

import { CONNECTION_STATE_CHANGE, ConnectionState } from 'aws-amplify/data';
import { Hub } from 'aws-amplify/utils';
Hub.listen('api', ({ payload }) => {
  if (payload.event === CONNECTION_STATE_CHANGE)
    console.log(payload.data.connectionState as ConnectionState);
});

Estados incluem Connected, Connecting, ConnectedPendingDisconnect, ConnectedPendingKeepAlive e ConnectedPendingNetwork.

10. Custom subscriptions / PubSub

Use a.subscription() quando o evento exigir lógica de negócio customizada.
Uma custom subscription define: mutations que disparam o evento, tipo de retorno compatível e authorization rules. Pode definir argumentos e handler para filtros server-side.

receive: a.subscription()
  .for(a.ref('publish'))
  .handler(a.handler.custom({ entry: './receive.js' }))
  .authorization(allow => [allow.publicApiKey()])

A mutation pode usar a.mutation().arguments(...).returns(...).handler(...).
Handlers customizados podem transformar argumentos e resultados. Um handler de passthrough pode retornar ctx.args; o de subscription pode retornar ctx.result.
No cliente, custom subscriptions aparecem em client.subscriptions:

const sub = client.subscriptions.receive().subscribe({
  next: event => console.log(event)
});

Custom mutation pode publicar:

client.mutations.publish({
  channelName: 'world',
  content: 'My first message!'
});

Desconectar com sub.unsubscribe().
Custom subscription aceita filtros próprios, por exemplo namePrefix, tratados pelo handler.
Atenção: custom subscription não suporta estratégia owner; isso pode ampliar a audiência do evento.

11. Optimistic UI

Amplify Data pode ser combinado com TanStack Query para CRUD otimista: atualizar a UI antes da resposta, exibir loading/error e fazer rollback se a API falhar.
Instalação: npm add @tanstack/react-query e opcionalmente npm add --save-dev @tanstack/react-query-devtools.
Use QueryClient + QueryClientProvider.
Query keys devem ser arrays, serializáveis e únicas.
Padrões:

lista: ['realEstateProperties']

item: ['realEstateProperties', id]
Create deve atualizar a cache da lista; update/delete devem usar a key que inclui o ID. Em erro, restaurar o estado anterior.

12. Next.js Server Runtime

No servidor, usar clientes de @aws-amplify/adapter-nextjs/data, não o cliente browser.
App Router:

React Server Component → generateServerClientUsingCookies()

Server Action → generateServerClientUsingCookies()

Route Handler → generateServerClientUsingCookies()

Middleware → generateServerClientUsingReqRes()
Pages Router:

Server-side component → generateServerClientUsingReqRes()

API Route → generateServerClientUsingReqRes()

Middleware → generateServerClientUsingReqRes()
Cliente por cookies:

import { cookies } from 'next/headers';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
export const serverClient = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies
});

Cliente Req/Res:

import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { generateServerClientUsingReqRes } from '@aws-amplify/adapter-nextjs/data';
export const { runWithAmplifyServerContext } = createServerRunner({ config: outputs });
export const serverClient = generateServerClientUsingReqRes<Schema>({ config: outputs });

Com Req/Res, executar a chamada dentro de runWithAmplifyServerContext e passar NextRequest/NextResponse, evitando contaminação de tokens entre requests.
Queries e mutations estão disponíveis no server runtime; subscriptions não estão disponíveis.

13. Padrões de implementação

Preferir TypeScript e Schema.

Centralizar configuração do Amplify.

Separar cliente browser e clientes server-side.

Usar authMode explicitamente quando houver múltiplos modos.

Usar filtros server-side e paginação para listas grandes.

Usar selectionSet para controlar payload.

Cancelar subscriptions no cleanup.

Para listas real-time, preferir observeQuery.

Não esperar propagação automática de mudanças entre modelos relacionados.

Usar a.subscription() para PubSub customizado.

Usar TanStack Query para UI otimista e rollback.

Tratar sempre errors retornado pelo Data client.

Nunca expor secrets/API keys privadas no cliente.

No Next.js server runtime, nunca usar generateClient() browser para contexto autenticado do servidor.

14. Fluxo recomendado

Browser/Client Component → generateClient<Schema>() → Amplify Data/AppSync.
Server Component/Server Action/Route Handler → generateServerClientUsingCookies() → Amplify Data.
Middleware/Pages Router → generateServerClientUsingReqRes() + runWithAmplifyServerContext() → Amplify Data.
Real-time → onCreate/onUpdate/onDelete ou observeQuery.
PubSub → a.mutation() + a.subscription() + handlers.
UI otimista → TanStack Query + mutations Amplify.

15. Template de operação

const client = generateClient<Schema>();
const { data, errors } = await client.models.Model.list({
  filter: { status: { eq: 'ACTIVE' } }
});
if (errors?.length) {
  throw new Error(errors.map(e => e.message).join('; '));
}
return data;