AWS Amplify Gen 2 — Data (Next.js)

Objetivo

Guia operacional para implementar o backend de dados de uma aplicação Next.js com AWS Amplify Gen 2. O recurso Data permite definir o schema em TypeScript e provisionar uma API GraphQL em AWS AppSync integrada ao Amazon DynamoDB, com autorização, operações CRUD, subscriptions em tempo real, validação, logging e lógica de negócio customizada.

Arquitetura

Definição principal: amplify/data/resource.ts.

Schema: a.schema({...}).

Modelos: a.model({...}).

API gerada: AWS AppSync/GraphQL.

Persistência padrão: Amazon DynamoDB.

Eventos realtime: subscriptions de criação, atualização e exclusão.

Autorização: regras .authorization(...).

Configuração publicada para o frontend: amplify_outputs.json.

Operações customizadas: a.query(), a.mutation() e a.subscription().

Lógica avançada: AWS Lambda ou AppSync JavaScript resolvers.

Desenvolvimento: npx ampx sandbox.

O Data é definido como código TypeScript e pode ser combinado com recursos AWS/CDK.

Setup

Após criar o projeto Amplify, confirme a existência de amplify/data/resource.ts.
Exemplo mínimo:

import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a.model({
    content: a.string(),
    isDone: a.boolean()
  }).authorization(allow => [allow.publicApiKey()])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: { expiresInDays: 30 }
  }
});

Cada a.model() gera tabela DynamoDB, operações de create/read/update/delete, createdAt, updatedAt e APIs realtime.
Para provisionar um sandbox:

npx ampx sandbox

O sandbox gera amplify_outputs.json, contendo informações necessárias para conexão, como endpoint e configuração de autenticação.

Conectar o frontend

Instale:

npm add aws-amplify

Configure o Amplify usando amplify_outputs.json e gere um cliente tipado:

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

As operações do cliente devem usar o schema gerado para manter type-safety ponta a ponta.

Modelagem

Todo modelo pertence a um a.schema(). É possível definir:

Escalares: string, boolean, integer, float, ID etc.

Campos obrigatórios: a.string().required().

Tipos customizados: a.customType({...}).

Enums: a.enum(["VALUE1","VALUE2"]).

Arrays: a.string().array().

Identificadores personalizados: .identifier(["campo"]).

Relacionamentos: hasMany, belongsTo, hasOne e manyToMany conforme o desenho do domínio.

Índices secundários para otimizar consultas.
Exemplo:

const schema = a.schema({
  Customer: a.model({
    customerId: a.id().required(),
    name: a.string(),
    collectionId: a.id(),
    collection: a.belongsTo('Collection', 'collectionId')
  }).identifier(['customerId']),
  Collection: a.model({
    customers: a.hasMany('Customer', 'collectionId'),
    tags: a.string().array()
  })
});

Projete relacionamentos e índices considerando os padrões reais de leitura; DynamoDB é orientado a acesso e não deve ser modelado como um banco relacional tradicional.

Autorização

Use .authorization() para controlar acesso. O modelo é deny-by-default: sem regra explícita, o acesso é negado.
Estratégias principais:

allow.publicApiKey(): acesso público via API key; útil para dados realmente públicos.

allow.guest(): acesso não autenticado usando identidade do Cognito Identity Pool; indicado para acesso público em produção quando apropriado.

allow.owner(): acesso por proprietário do registro.

allow.authenticated(): qualquer usuário autenticado.

allow.group(): acesso por grupo.

allow.custom(): autorização personalizada executada por função Lambda.
As regras podem limitar operações com .to(['read']), combinar múltiplas regras e ser aplicadas no schema, modelo ou campo.
Exemplo:

Post: a.model({
  content: a.string()
}).authorization(allow => [
  allow.publicApiKey().to(['read']),
  allow.owner()
])

Para produção, evite API keys quando o dado não for realmente público. Prefira Cognito/Identity Pool, owner, grupos ou regras customizadas conforme o domínio.

Regras de autorização e campos

Autorização pode ser global, por modelo ou por campo. Use autorização de campo para impedir que determinados atributos sejam lidos ou alterados por perfis sem permissão.
Não confunda autenticação com autorização: autenticação identifica o usuário; as regras do Data determinam o que ele pode fazer.

Custom business logic

Use a.query() para operações somente de leitura e a.mutation() quando houver alteração de dados. Cada operação define argumentos, tipo de retorno e autorização.

const schema = a.schema({
  EchoResponse: a.customType({
    content: a.string(),
    executionDuration: a.float()
  }),
  echo: a.query()
    .arguments({ content: a.string() })
    .returns(a.ref('EchoResponse'))
    .authorization(allow => [allow.authenticated()])
});

Mutations seguem o mesmo padrão:

likePost: a.mutation()
  .arguments({ postId: a.string() })
  .returns(a.ref('Post'))
  .authorization(allow => [allow.authenticated()])

A implementação pode usar:

Lambda function para lógica de negócio, integrações externas, chamadas a outros serviços AWS ou processamento complexo.

AppSync JavaScript resolver para lógica diretamente no resolver.
Handlers podem usar o tipo Schema para obter parâmetros e retornos type-safe.
Use custom queries/mutations quando a operação não se encaixar no CRUD automático de um modelo.

Integrações e fontes existentes

Amplify Data pode ser estendido para trabalhar com fontes de dados existentes. Os cenários documentados incluem:

MySQL existente.

PostgreSQL existente.

Amazon DynamoDB externo.

Custom queries/mutations para encapsular acesso a fontes externas.
Ao integrar banco existente, mantenha a responsabilidade de conexão e credenciais no backend e não exponha secrets no frontend.

Amplify Console — Data Manager

Após o recurso Data ser implantado, o Amplify Console fornece o Data Manager para administrar dados da API GraphQL sem criar uma tela administrativa separada.
Fluxo:

Abrir a aplicação no Amplify Console.

Selecionar a branch.

Abrir Data.

Abrir Data manager.
É possível:

Criar registros.

Editar registros.

Excluir um ou vários registros.

Gerar dados de teste.
O recurso de geração automática permite até 100 registros por vez. A geração não está disponível para campos AWSPhone, Enum, Custom Type ou Relationship.

Logging

Ative logging GraphQL com:

export const data = defineData({
  schema,
  logging: true
});

O padrão utiliza:

excludeVerboseContent: true

fieldLogLevel: 'none'

retention: '1 week'
É possível customizar:

logging: {
  excludeVerboseContent: false,
  fieldLogLevel: 'all',
  retention: '1 month'
}

Os logs são enviados ao Amazon CloudWatch.
Cuidado: excludeVerboseContent: false pode registrar queries completas e parâmetros do usuário, potencialmente contendo dados sensíveis. Restrinja o acesso aos logs por IAM e habilite conteúdo detalhado somente quando necessário.

Field-level validation

Validações podem ser anexadas diretamente ao campo com .validate(...).

content: a.string().validate(v =>
  v
    .minLength(1, 'Content must be at least 1 character long')
    .maxLength(100, 'Content must be less than 100 characters')
    .matches('^[a-zA-Z0-9\\s]+$', 'Content must contain only letters, numbers, and spaces')
)

Validadores de string incluem minLength, maxLength, startsWith e matches. Use mensagens claras para erros de domínio.
A validação deve complementar, e não substituir, regras de negócio e autorização.

API Reference

generateClient cria um cliente capaz de trabalhar com modelos e GraphQL bruto.

import { generateClient } from 'aws-amplify/data';
const client = generateClient<Schema>();

O cliente é parametrizado pelo Schema para manter tipagem.
Use os métodos gerados para CRUD, queries/mutations customizados e subscriptions conforme o schema.

Padrões recomendados para o projeto

Centralize o Data backend em amplify/data/resource.ts e funções auxiliares em diretórios próprios.

Use nomes de modelos e campos consistentes com o domínio.

Defina identificadores e índices conscientemente antes de criar grandes volumes de dados.

Prefira regras de autorização explícitas e deny-by-default.

Não use publicApiKey para dados privados.

Coloque regras de negócio sensíveis no backend.

Use Lambda para integrações externas e processamento complexo.

Use validação de campo para invariantes simples.

Habilite CloudWatch logging em ambientes onde troubleshooting seja necessário.

Evite logging de payloads sensíveis.

Use Schema e generateClient<Schema>() no frontend para type-safety.

Teste autorização, CRUD, relacionamentos, validações e subscriptions antes do deploy.

Trate amplify_outputs.json como configuração gerada pelo Amplify; não edite manualmente para implementar regras de backend.

Checklist de implementação

Criar amplify/data/resource.ts.

Definir a.schema().

Modelar entidades com a.model().

Definir IDs, relacionamentos e índices.

Definir autorização para schema/modelos/campos.

Adicionar validações de campos.

Criar queries/mutations customizadas quando necessário.

Associar handlers Lambda ou resolvers quando necessário.

Configurar fontes externas, se aplicável.

Executar npx ampx sandbox.

Configurar frontend com amplify_outputs.json.

Usar generateClient<Schema>().

Testar CRUD e autorização.

Testar lógica customizada.

Validar logs no CloudWatch.

Revisar exposição de dados sensíveis.

Implantar e validar no Amplify Console.

Regra para o OpenCode

Ao alterar o backend de dados, prefira modificar o schema TypeScript e as funções/resolvers correspondentes em vez de alterar recursos AWS manualmente. Preserve type-safety, autorização deny-by-default, validação de entrada e separação entre frontend e lógica sensível de backend.