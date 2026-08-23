AWS Amplify Gen 2 — Storage (Next.js)

Objetivo

Guia para implementar Storage em AWS Amplify Gen 2/Next.js. O Storage usa Amazon S3, é definido em TypeScript e integra autorização, Functions/Lambda, CDK e APIs do frontend.

Arquitetura

amplify/
├── backend.ts
├── storage/
│   ├── resource.ts
│   ├── on-upload-handler.ts
│   └── on-delete-handler.ts
└── functions/<function>/resource.ts

defineStorage() declara o bucket; amplify/backend.ts registra o recurso; npx ampx sandbox cria o ambiente; deploy/CI-CD publica alterações.

Storage básico

amplify/storage/resource.ts

import { defineStorage } from '@aws-amplify/backend';
export const storage = defineStorage({ name: 'myProjectFiles' });

amplify/backend.ts

import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
defineBackend({ auth, storage });

Autorização

Por padrão, nenhum usuário/recurso tem acesso. Libere explicitamente por path:

export const storage = defineStorage({
  name: 'myProjectFiles',
  access: (allow) => ({
    'media/*': [allow.authenticated.to(['read','write','delete'])],
    'public/*': [allow.guest.to(['read'])]
  })
});

Paths não devem começar com /.

Regras

allow.guest: não autenticado.

allow.authenticated: autenticado.

allow.groups(['admin']): grupos.

allow.entity('identity'): arquivos vinculados ao Identity Pool ID.

allow.resource(function): acesso de uma Function.

Ações: read = getUrl, downloadData, list, getProperties; get = getUrl, downloadData; list = list, getProperties; write = uploadData, copy; delete = remove.

Isolamento por usuário

export const storage = defineStorage({
  name: 'myProjectFiles',
  access: (allow) => ({
    'private/{entity_id}/*': [
      allow.entity('identity').to(['read','write','delete'])
    ]
  })
});

{entity_id} é substituído pela identidade do usuário. É o padrão recomendado quando cada usuário deve acessar apenas seus próprios arquivos.

Grupos

export const storage = defineStorage({
  name: 'myProjectFiles',
  access: (allow) => ({
    'media/*': [
      allow.groups(['auditor']).to(['read']),
      allow.groups(['admin']).to(['read','write','delete'])
    ]
  })
});

Usuários de grupos recebem o papel do grupo; não dependa das permissões do papel autenticado.

Precedência de paths

Paths específicos podem restringir um path amplo:

access: (allow) => ({
  'media/*': [allow.authenticated.to(['read','write','delete'])],
  'media/profile-pictures/*': [allow.guest.to(['read'])]
})

Modele permissões com o menor escopo possível.

Múltiplos buckets

export const firstBucket = defineStorage({
  name: 'firstBucket', isDefault: true
});
export const secondBucket = defineStorage({
  name: 'secondBucket',
  access: (allow) => ({
    'private/{entity_id}/*': [
      allow.entity('identity').to(['read','write','delete'])
    ]
  })
});

Nomes devem ser únicos. Com múltiplos buckets, um deve ser isDefault: true. Nas APIs, informe o bucket alvo pela opção bucket.

Function com acesso ao Storage

import { defineStorage } from '@aws-amplify/backend';
import { generateReports } from '../functions/generate-reports/resource';

export const storage = defineStorage({
  name: 'myReports',
  access: (allow) => ({
    'reports/*': [
      allow.resource(generateReports).to(['read','write','delete'])
    ]
  })
});

O Amplify disponibiliza <storage-name>_BUCKET_NAME para a Function, permitindo chamadas ao S3 via AWS SDK.

Lambda triggers

Triggers simples:

import { defineFunction, defineStorage } from '@aws-amplify/backend';
export const storage = defineStorage({
  name: 'myProjectFiles',
  triggers: {
    onUpload: defineFunction({ entry: './on-upload-handler.ts' }),
    onDelete: defineFunction({ entry: './on-delete-handler.ts' })
  }
});

Instale @types/aws-lambda:

npm add --save @types/aws-lambda

Handler:

import type { S3Handler } from 'aws-lambda';
export const handler: S3Handler = async (event) => {
  const keys = event.Records.map(r => r.s3.object.key);
  console.log(`Objects: ${keys.join(', ')}`);
};

onUpload e onDelete são executados após os eventos correspondentes.

Triggers avançados

Para filtrar evento, prefixo ou sufixo, use CDK em backend.ts:

import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';

backend.storage.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED_PUT,
  new LambdaDestination(backend.yourLambda.resources.lambda),
  { prefix: 'protected/uploads/', suffix: '-uploadManifest.json' }
);

Ao usar addEventNotification, remova triggers de storage/resource.ts.

Estender S3 com CDK

O bucket gerado pode ser customizado:

import * as s3 from 'aws-cdk-lib/aws-s3';
const s3Bucket = backend.storage.resources.bucket;
const cfnBucket = s3Bucket.node.defaultChild as s3.CfnBucket;
cfnBucket.accelerateConfiguration = { accelerationStatus: 'Enabled' };

Use o L1 CDK/escape hatch quando a configuração necessária não estiver exposta pelo construct L2.

CORS

Para S3 configurado manualmente, configure CORS. Exemplo:

[{
  "AllowedHeaders":["*"],
  "AllowedMethods":["GET","HEAD","PUT","POST","DELETE"],
  "AllowedOrigins":["*"],
  "ExposeHeaders":["x-amz-server-side-encryption","x-amz-request-id","x-amz-id-2","ETag"],
  "MaxAgeSeconds":3000
}]

Em produção, restrinja AllowedOrigins aos domínios necessários.

APIs do Storage

Principais operações em aws-amplify/storage:

uploadData: upload para S3.

downloadData: download do conteúdo.

getUrl: URL presigned temporária.

getProperties: propriedades do objeto.

list: lista objetos.

remove: remove arquivo/pasta.

copy: copia objeto.

APIs paginadas: use quando houver grande volume de arquivos.
Prefira APIs baseadas em path no código novo.

Upload

uploadData usa PUT simples para payloads menores que 5 MB e multipart upload para arquivos maiores ou tamanho indeterminado. Máximo: 5 TB; se o tamanho não puder ser determinado antes do upload, 50 GB.

URL presigned

getUrl gera URL temporária. A validade depende das credenciais e de expiresIn. validateObjectExistence: true verifica se o objeto existe antes de gerar a URL.

Listagem

list lista objetos de um path; listAll pode obter todos. Para grandes volumes, prefira paginação.

Amplify Console

Após o Storage ser implantado: Amplify Console → aplicação → branch → Storage.

Upload: Upload ou drag-and-drop.

Delete: arquivo → Actions → Delete.

Copy: arquivo → Actions → Copy to.

Move: arquivo → Actions → Move to.
A interface é útil para testes e administração manual dos arquivos.

Boas práticas

Negue por padrão e conceda somente os paths necessários.

Separe público, privado e administrativo por prefixos.

Use {entity_id} para arquivos pertencentes a usuários.

Evite guest com write/delete sem necessidade.

Use grupos para áreas administrativas.

Use Functions para processamento após upload.

Use filtros de evento para evitar invocações desnecessárias.

Use CDK para configurações S3 avançadas.

Restrinja CORS em produção.

Planeje tamanho de upload, retenção e custos.

Referência rápida

Necessidade

Solução

Bucket

defineStorage()

Backend

defineBackend({ storage })

Path ACL

access()

Usuário

{entity_id} + allow.entity()

Grupo

allow.groups()

Function

allow.resource()

Upload trigger

triggers.onUpload

Delete trigger

triggers.onDelete

Trigger filtrado

CDK addEventNotification()

Customizar S3

backend.storage.resources.bucket

Upload

uploadData()

Download

downloadData()

URL

getUrl()

Listar

list()

Remover

remove()

Copiar

copy()

Console

Amplify Console → Storage

Fontes oficiais

https://docs.amplify.aws/nextjs/build-a-backend/storage/

https://docs.amplify.aws/nextjs/build-a-backend/storage/set-up-storage/

https://docs.amplify.aws/nextjs/build-a-backend/storage/lambda-triggers/

https://docs.amplify.aws/nextjs/build-a-backend/storage/extend-s3-resources/

https://docs.amplify.aws/nextjs/build-a-backend/storage/manage-with-amplify-console/

https://docs.amplify.aws/nextjs/build-a-backend/storage/reference/