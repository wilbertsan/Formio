Amplify UI Storage para React — Guia de Projeto

Objetivo

Use os componentes conectados do Amplify UI para integrar React ao Amazon S3:

StorageImage: exibe imagens do Amplify Storage.

FileUploader: seleciona, envia e gerencia uploads.

StorageBrowser: navega, envia, baixa, copia e exclui arquivos/pastas.
Storage UI usa Amplify Storage e requer autorização adequada.

Instalação e configuração

npm install @aws-amplify/ui-react-storage aws-amplify

ou:

yarn add @aws-amplify/ui-react-storage aws-amplify

Configure o Amplify antes dos componentes:

import { Amplify } from 'aws-amplify';
import { StorageImage, FileUploader } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';
import config from './amplify_outputs.json';
Amplify.configure(config);

Gen 1: amplify init, depois amplify add storage; para backend existente, amplify pull.
Storage normalmente requer Auth. Em conteúdo protegido/privado, use Cognito/Amplify Auth e regras de acesso coerentes.

Next.js

Com Next.js 13.4+ App Router, os componentes interativos precisam estar em Client Components:

'use client';

Com Pages Router não é necessário.

Paths

Prefira o modelo atual baseado em path:

Público: public/cat.jpg

Protegido: protected/{identityId}/cat.jpg

Privado: private/{identityId}/cat.jpg
path representa a chave/prefixo S3 e pode ser string ou função que recebe identityId.

StorageImage

Uso mínimo:

<StorageImage alt="sleepy-cat" path="public/cat.jpg" />

Props essenciais:

alt: texto alternativo.

path: chave completa do objeto; string ou (input: { identityId?: string }) => string.
Imagem protegida:

<StorageImage
  alt="protected cat"
  path={({ identityId }) => `protected/${identityId}/cat.jpg`}
/>

Para conteúdo privado/protegido, use Authenticator/withAuthenticator para disponibilizar o identityId.
Props úteis:

bucket: nome amigável ou { bucketName, region }.

fallbackSrc: imagem alternativa em caso de erro.

loadingElement: elemento durante carregamento.

onGetUrlError: callback de erro do Storage.
Legado: imgKey, accessLevel e identityId foram substituídos por path; não use em código novo.

FileUploader

Uso:

<FileUploader
  acceptedFileTypes={['image/*']}
  path="public/"
  maxFileCount={1}
  isResumable
/>

Obrigatórios: path e maxFileCount.
Upload protegido:

<FileUploader
  acceptedFileTypes={['image/*']}
  path={({ identityId }) => `protected/${identityId}/`}
  maxFileCount={1}
  isResumable
/>

Props importantes:

acceptedFileTypes: tipos permitidos; segue o atributo HTML accept.

maxFileCount: quantidade máxima de arquivos.

maxFileSize: tamanho máximo em bytes; padrão ilimitado.

autoUpload: inicia automaticamente; padrão true.

bucket: seleciona bucket.

isResumable: upload pausável/resumível.

onUploadStart(file): início.

onUploadSuccess(file): sucesso.
Exemplo de restrições:

<FileUploader
  acceptedFileTypes={['.jpg', '.jpeg', 'image/png', 'video/*']}
  path="public/"
  maxFileCount={5}
  maxFileSize={10000}
/>

Upload manual:

<FileUploader
  acceptedFileTypes={['image/*']}
  path="public/"
  autoUpload={false}
  maxFileCount={1}
/>

Bucket por nome:

<FileUploader bucket="my-bucket" path="public/" maxFileCount={1} />

Ou:

<FileUploader
  bucket={{ bucketName: 'my-bucket-xxxxxxxx', region: 'us-west-2' }}
  path="public/"
  maxFileCount={1}
/>

isResumable divide uploads em chunks e permite pausar/retomar; é especialmente útil para arquivos maiores que aproximadamente 5 MB.

Storage Browser

Fornece interface gráfica para S3. Permite navegar, pesquisar, upload, download, copiar, excluir arquivos/pastas e visualizar imagens, vídeos e textos.
O usuário só vê Locations autorizadas e, após entrar em uma Location, pode navegar para baixo no caminho, não para níveis superiores.
Uso:

import { StorageBrowser } from './StorageBrowser';
export default function Example() {
  return <StorageBrowser />;
}

Autorização

Há três modelos:

Amplify Auth: Cognito + IAM; opção simples para projetos Amplify.

IAM Identity Center + S3 Access Grants: adequado para acesso por prefixo a usuários/grupos corporativos.

Customer-managed auth: usa o serviço próprio de identidade/autorização.
O Storage Browser assina chamadas S3 com credenciais temporárias.

Amplify Auth + Gen 2

export const storage = defineStorage({
  name: 'myProjectFiles',
  access: (allow) => ({
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'protected/{entity_id}/*': [
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete'])
    ],
    'private/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete'])
    ]
  })
});

Configuração do Browser:

import {
  createAmplifyAuthAdapter,
  createStorageBrowser,
} from '@aws-amplify/ui-react-storage/browser';
import '@aws-amplify/ui-react-storage/styles.css';
Amplify.configure(config);
export const { StorageBrowser } = createStorageBrowser({
  config: createAmplifyAuthAdapter(),
});

Amplify.configure() deve ocorrer antes de createAmplifyAuthAdapter().

Customer-managed auth

A configuração precisa fornecer region, accountId, listLocations, getLocationCredentials e registerAuthListener.
listLocations informa bucket, prefix, id, tipo e permissões. getLocationCredentials fornece credenciais temporárias por escopo/permissão.
Nunca coloque credenciais AWS permanentes no frontend.

Bucket S3 existente e CORS

Buckets existentes podem ser integrados. Para Storage Browser, buckets e paths podem ser necessários na configuração para exibir corretamente as Locations.
Como o Browser faz chamadas S3 diretamente do navegador, buckets externos ao Amplify precisam de CORS. Métodos usados incluem GET, HEAD, PUT, POST e DELETE.
Em produção, restrinja AllowedOrigins ao domínio real; evite * quando possível.
Exemplo:

[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://app.example.com"],
    "ExposeHeaders": [
      "last-modified", "content-type", "content-length", "etag",
      "x-amz-version-id", "x-amz-request-id", "x-amz-id-2", "date"
    ],
    "MaxAgeSeconds": 3000
  }
]

Downloads em lote

Storage Browser usa Service Worker para streaming de ZIPs, evitando montar grandes arquivos inteiramente na memória.
Copie:

npx @aws-amplify/ui-react-storage copy-serviceworker public

Resultado:
public/amplify-storage-download/download-sw.js
Para Amplify Hosting:

frontend:
  phases:
    preBuild:
      commands:
        - npx @aws-amplify/ui-react-storage copy-serviceworker public
    build:
      commands:
        - npm run build

Ou:

{"scripts":{"prebuild":"npx @aws-amplify/ui-react-storage copy-serviceworker public"}}

Se o Service Worker não estiver disponível, há fallback para download baseado em Blob em memória.

Storage Browser — paginação e tema

pageSize controla itens por página; padrão: 100.

<StorageBrowser pageSize={50} />

Deve ser inteiro positivo e afeta Locations, detalhes e Upload.
O Browser usa componentes Amplify UI e pode herdar o tema existente. Também pode ser customizado com createTheme, defineComponentTheme, tokens ou CSS.

Migração

A partir de @aws-amplify/ui-react-storage 3.3.0, StorageManager foi renomeado para FileUploader.
Antigo:

<StorageManager accessLevel="guest" path="images/" maxFileCount={1} />

Atual:

<FileUploader path="public/images/" maxFileCount={1} />

Privado por usuário:

<FileUploader
  path={({ identityId }) => `private/${identityId}/images/`}
  maxFileCount={1}
/>

accessLevel antigo (guest, protected, private) deve ser substituído por paths explícitos.

Padrões do projeto

Prefira path ao modelo legado.

Use private/{identityId}/ ou protected/{identityId}/ para dados por usuário.

Defina limites de upload.

Use isResumable para arquivos grandes/conexões instáveis.

Use StorageImage para exibição de imagens.

Use FileUploader para fluxos de upload.

Use StorageBrowser para gerenciamento completo de arquivos.

Em Next.js App Router, use Client Components.