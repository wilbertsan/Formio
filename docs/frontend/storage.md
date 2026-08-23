AWS Amplify Storage — Guia para OpenCode

Objetivo

Usar AWS Amplify Gen 2 Storage em Next.js para armazenar arquivos no Amazon S3. As APIs principais são uploadData, downloadData, getUrl, list, remove e copy.

Fontes oficiais

https://docs.amplify.aws/nextjs/frontend/storage/

https://docs.amplify.aws/nextjs/frontend/storage/upload-files/

https://docs.amplify.aws/nextjs/frontend/storage/download-files/

https://docs.amplify.aws/nextjs/frontend/storage/list-files/

https://docs.amplify.aws/nextjs/frontend/storage/remove-files/

https://docs.amplify.aws/nextjs/frontend/storage/copy-files/

https://docs.amplify.aws/nextjs/frontend/storage/use-with-custom-s3/

Princípios

Usar aws-amplify/storage.

Configurar Amplify antes de chamar APIs.

Nunca colocar credenciais AWS no frontend.

Controlar acesso por regras Storage/IAM.

Preferir path às APIs legadas baseadas em key.

Validar erros, cancelamentos e progresso.

Backend

amplify/storage/resource.ts:

import { defineStorage } from '@aws-amplify/backend';
export const storage = defineStorage({ name: 'projectStorage' });

amplify/backend.ts:

import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
defineBackend({ auth, storage });

Sem regras de acesso, os arquivos não devem ser acessíveis. Exemplo:

export const storage = defineStorage({
  name: 'projectStorage',
  access: (allow) => ({
    'public/*': [allow.guest.to(['read']),allow.authenticated.to(['read','write','delete'])],
    'private/{entity_id}/*': [allow.entity('identity').to(['read','write','delete'])]
  })
});

Use entity_id/identity ID para separar arquivos por usuário e aplique menor privilégio.

Múltiplos buckets

É possível definir vários buckets. Um deve ser padrão com isDefault: true:

export const firstBucket = defineStorage({ name: 'firstBucket', isDefault: true });
export const secondBucket = defineStorage({ name: 'secondBucket' });

As APIs aceitam bucket: 'secondBucket' ou { bucketName, region }.

Cliente

import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
Amplify.configure(outputs);

Execute a configuração cedo. Sem ela podem ocorrer erros NoCredentials.

Upload

import { uploadData } from 'aws-amplify/storage';
const result = await uploadData({ path: 'uploads/file.jpg', data: file }).result;

data pode representar arquivo/dados em memória compatíveis com a API. Caminho por usuário:

path: ({ identityId }) => `users/${identityId}/file.jpg`

Opções relevantes: bucket, contentType, contentEncoding, contentDisposition, metadata, useAccelerateEndpoint, expectedBucketOwner, preventOverwrite e checksumAlgorithm: 'crc-32'.
Arquivos maiores que 5 MB usam multipart upload automaticamente. Limite máximo normal: 5 TB. Se o tamanho não puder ser determinado antes, limite: 50 GB.
Uploads iniciados há mais de uma hora são cancelados automaticamente. Recomenda-se lifecycle no S3 para limpar multipart uploads incompletos.

Upload UI

Para React, existe FileUploader:

npm add @aws-amplify/ui-react-storage aws-amplify

import { FileUploader } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';
<FileUploader acceptedFileTypes={['image/*']} path="public/" maxFileCount={1} isResumable />

Use FileUploader para fluxo pronto e uploadData para controle customizado.

Presigned URL

getUrl pode gerar URL temporária. Com method: 'PUT', permite upload direto no S3. É útil para integrações HTTP, ferramentas externas e rotas server-side.

Download

import { downloadData } from 'aws-amplify/storage';
const { body, eTag } = await downloadData({ path: 'uploads/file.jpg' }).result;
const blob = await body.blob();

O resultado fornece body e eTag. Opções incluem bucket, onProgress, useAccelerateEndpoint e expectedBucketOwner.
Progresso:

const { body } = await downloadData({
  path: 'uploads/file.jpg',
  options: { onProgress: ({ transferredBytes,totalBytes }) => {
    console.log(totalBytes ? transferredBytes / totalBytes * 100 : 0);
  }}
}).result;

Downloads podem ser cancelados; use isCancelError(error) para identificar cancelamento.

URL temporária

getUrl gera URL pré-assinada para acesso temporário ao objeto. Use quando a aplicação precisa entregar uma URL em vez de manipular o conteúdo diretamente.

Listagem

import { list } from 'aws-amplify/storage';
const result = await list({ path: 'uploads/' });
console.log(result.items);

list retorna propriedades dos objetos. pageSize padrão é 1000 e o intervalo é 0–1000.
Paginação:

let nextToken;
const response = await list({ path: 'uploads/', options: { pageSize: 20, nextToken } });
nextToken = response.nextToken;

Para tudo:

const result = await list({ path: 'uploads/', options: { listAll: true } });

Pastas S3 são virtuais: / faz parte da chave. Uma pasta manual pode aparecer com tamanho 0. subpathStrategy permite incluir ou excluir arquivos em subcaminhos.
Opções: bucket, listAll, pageSize, nextToken, subpathStrategy, useAccelerateEndpoint, expectedBucketOwner.

Remoção

import { remove } from 'aws-amplify/storage';
await remove({ path: 'uploads/file.jpg' });

Também é possível remover pasta e conteúdo:

await remove({ path: 'uploads/old/' });

Para arquivos protegidos por identidade, somente o proprietário deve ter delete. Em pastas grandes, acompanhar progresso e falhas.

Cópia

import { copy } from 'aws-amplify/storage';
const result = await copy({
  source: { path: 'uploads/file.jpg' },
  destination: { path: 'archive/file.jpg' }
});

Uma operação copia um objeto para outro caminho. Limite de cópia simples: 5 GB.
Caracteres especiais no source devem ser URI encoded; cada segmento do source deve ser codificado quando necessário. O destination não exige o mesmo tratamento.
Pode-se informar bucket/região, eTag, notModifiedSince e expectedBucketOwner. Cópia entre identidades depende das permissões do destino. Cópia entre buckets/regiões é possível quando permissões e configuração permitem.

S3 existente

Amplify Storage pode usar bucket S3 criado fora do Amplify. Requer Amplify Auth configurado.
O role IAM precisa das permissões necessárias. Exemplo:

{
  "Version":"2012-10-17",
  "Statement":[{
    "Effect":"Allow",
    "Action":["s3:PutObject","s3:GetObject","s3:DeleteObject","s3:ListBucket"],
    "Resource":["arn:aws:s3:::BUCKET","arn:aws:s3:::BUCKET/*"]
  }]
}

Substitua BUCKET e associe a policy ao role correto. Bucket customizado usado pelo navegador também precisa de CORS.

Configurar bucket existente

Use Bucket.fromBucketAttributes e backend.addOutput:

const customBucket = Bucket.fromBucketAttributes(stack,'CustomBucket',{
  bucketArn:'arn:aws:s3:::BUCKET',region:'us-east-1'
});
backend.addOutput({ storage: {
  aws_region: customBucket.env.region,
  bucket_name: customBucket.bucketName,
  buckets: [{
    aws_region: customBucket.env.region,
    bucket_name: customBucket.bucketName,
    name: customBucket.bucketName,
    paths: {'public/*': { authenticated:['get','list','write','delete'] }}
  }]
}});

Storage gerenciado pelo Amplify e bucket customizado podem coexistir. O bucket Amplify é o padrão; o customizado é adicional.

IAM

Não usar s3:* sem necessidade. Restrinja ações por prefixo.
Para usuários autenticados, conceda somente GetObject, PutObject e DeleteObject no prefixo necessário. Para ListBucket, use condições s3:prefix.
Grupos podem receber acesso a caminhos específicos como admin/*. Identity ID do Cognito pode restringir objetos ao proprietário.

Segurança

Não confie em ocultar caminhos no frontend.

IAM/bucket policy são a barreira real de acesso.

Separe arquivos privados por identidade.

Evite delete sem necessidade.

Use preventOverwrite quando substituição não for permitida.

Use checksum quando integridade for importante.

Nunca exponha credenciais AWS.

CORS deve permitir somente origens necessárias.

Next.js server-side

APIs Storage suportadas no servidor incluem getUrl, getProperties, list, remove e copy. Para uso server-side, siga os módulos aws-amplify/<category>/server indicados pela documentação Next.js. Para casos não suportados, considere AWS SDK para JavaScript.

Retenção

Por padrão, remover o recurso Storage pode remover bucket e objetos. Para preservar em ambientes deployados:

export const storage = defineStorage({ name:'projectStorage', keepOnDelete:true });

keepOnDelete:false é o padrão. Buckets preservados continuam gerando custos S3. Durante npx ampx sandbox, o bucket é removido independentemente de keepOnDelete.

Arquitetura recomendada

Definir Storage em amplify/storage/resource.ts.

Definir regras de acesso por prefixo.

Configurar Amplify.configure(outputs) no bootstrap.

Usar uploadData para uploads.

Usar downloadData para conteúdo.

Usar getUrl para URLs temporárias.

Usar list com paginação para listas grandes.

Usar remove somente após autorização.

Usar copy para arquivamento/duplicação.

Usar bucket customizado somente quando necessário.

Validar tamanho, MIME e nome antes do upload.

Tratar erros, cancelamentos e progresso.

Caminhos sugeridos

public/{categoria}/{arquivo}

users/{identityId}/{categoria}/{arquivo}

protected/{identityId}/{categoria}/{arquivo}

archive/{ano}/{mes}/{arquivo}
Normalize nomes e evite caracteres especiais desnecessários.

Checklist

aws-amplify instalado

Storage definido

Auth configurado

Amplify.configure() executado antes das APIs

Access rules definidas

CORS configurado se houver bucket customizado

IAM validado

Upload tratado

Download tratado

Listagem paginada

Remoção protegida

Cópia validada

Multipart incompleto limpo por lifecycle

Limites de tamanho/tipo definidos
-------------------------------------------
Referência rápida

API--------------Função

uploadData-----enviar objeto

downloadData-----baixar objeto

getUrl-----URL temporária

list-----listar objetos

remove-----excluir arquivo/pasta

copy-----copiar objeto

isCancelError-----identificar cancelamento