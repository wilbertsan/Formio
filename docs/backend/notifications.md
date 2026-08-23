# Amplify Gen 2 - Push Notifications

## Objetivo

Implementar notificações push em uma aplicação Next.js usando AWS Amplify Gen 2, Amazon Connect Customer Profiles, AWS End User Messaging, APNs e/ou Firebase Cloud Messaging (FCM).

## Arquitetura

`defineNotifications` cria a infraestrutura necessária para registrar dispositivos e entregar notificações push.
Fluxo principal:

1. Usuário autentica usando Amazon Cognito.
2. O cliente registra o dispositivo no backend.
3. O backend associa o dispositivo ao `principalId` da identidade Cognito.
4. O dispositivo é armazenado em uma tabela DynamoDB.
5. O perfil do usuário é armazenado no Amazon Connect Customer Profiles.
6. Uma jornada do Amazon Connect seleciona os perfis.
7. Uma custom action chama a Lambda de entrega criada pelo Amplify.
8. A Lambda localiza os dispositivos do perfil e envia a notificação via APNs ou FCM.
   O `principalId` é derivado pelo backend a partir da requisição assinada e não deve ser enviado pelo cliente.

## Recursos provisionados

`defineNotifications()` provisiona:

* Objeto `AmplifyProfile` no Customer Profiles.
* Campo pesquisável e único `principalId`.
* DynamoDB device store para dispositivos registrados.
* HTTP API com as rotas `identify-user`, `register-device` e `remove-device`.
* Autorização IAM e requisições Signature Version 4.
* Uma Lambda de menor privilégio para as três rotas.
* Lambda de entrega de notificações.
* Aplicação AWS End User Messaging.
* Canais APNs e/ou FCM configurados.
* Recursos relacionados ao Amazon Connect Customer Profiles.
  O endpoint e a região são disponibilizados em `amplify_outputs.json`.

## Pré-requisitos

O backend deve possuir Auth, pois as APIs usam requisições Signature Version 4 assinadas com credenciais do Cognito Identity Pool. Usuários autenticados e usuários guest podem utilizar as APIs conforme as permissões configuradas.
Instalar:

```bash
npm add @aws-amplify/backend-notifications
```

## Credenciais APNs

Para Apple Push Notification service são necessários:

* Chave de assinatura token `.p8`.
* Key ID da chave.
* Apple Team ID.
* Bundle ID da aplicação.
  A chave `.p8` deve ser armazenada como secret.

## Credenciais FCM

Para Firebase Cloud Messaging é necessário o JSON da service account do projeto Firebase.
O JSON deve ser armazenado como secret.

## Secrets

Nunca colocar credenciais APNs ou FCM diretamente no código ou no Git.
Criar secrets:

```bash
npx ampx sandbox secret set APNS_SIGNING_KEY
npx ampx sandbox secret set FCM_SERVICE_ACCOUNT_JSON
```

Use `secret()` no backend para referenciar esses valores.

## Configuração básica

Arquivo `amplify/backend.ts`:

```ts
import { defineBackend, secret } from '@aws-amplify/backend';
import { defineNotifications } from '@aws-amplify/backend-notifications';
import { auth } from './auth/resource';

defineBackend({
  auth,
  notifications: defineNotifications({
    apns: {
      tokenKey: secret('APNS_SIGNING_KEY'),
      tokenKeyId: 'A1B2C3D4E5',
      teamId: 'T9S8R7Q6P5',
      bundleId: 'com.example.myapp'
    },
    fcm: {
      serviceJson: secret('FCM_SERVICE_ACCOUNT_JSON')
    }
  })
});
```

## APNs

Configuração:

* `tokenKey`: conteúdo da chave `.p8`; obrigatório; usar `secret()`.
* `tokenKeyId`: ID da chave; obrigatório.
* `teamId`: Apple Developer Team ID; obrigatório.
* `bundleId`: Bundle ID; obrigatório.
* `sandbox`: opcional; `true` usa ambiente APNs sandbox para builds de desenvolvimento; padrão `false`.

## FCM

Configuração:

* `serviceJson`: conteúdo do Firebase service account JSON; obrigatório; usar `secret()`.

## Canais

`apns` e `fcm` são independentes e opcionais.
É possível habilitar somente APNs, somente FCM ou ambos.
Se um canal não for configurado, ele permanece desabilitado.

## Provisionamento automático

Por padrão:

```ts
notifications: defineNotifications()
```

O Amplify cria:

* Amazon Connect instance.
* Customer Profiles domain.
* `AmplifyProfile` object type.
  O primeiro deploy pode demorar mais que um deploy normal porque esses recursos são criados.

## Personalização do domínio criado

Quando o Amplify cria o domínio:

```ts
notifications: defineNotifications({
  instanceAlias: 'my-app-notifications',
  expirationDays: 90
})
```

`instanceAlias` define o alias da nova instância Amazon Connect. O alias deve ser globalmente único dentro da região AWS.
`expirationDays` define por quanto tempo os dados do Customer Profiles serão mantidos.

## Usar domínio existente

Para conectar a um Customer Profiles domain existente:

```ts
notifications: defineNotifications({
  domainName: 'amazon-connect-my-instance'
})
```

Nesse modo o Amplify não cria Amazon Connect nem Customer Profiles domain.
O Amplify registra o tipo `AmplifyProfile` de forma aditiva.
Tipos de objetos existentes permanecem intactos, permitindo compartilhar o domínio com outras workloads.

## Requisitos do domínio existente

O domínio existente deve:

* Estar na mesma conta AWS do projeto.
* Estar na mesma região AWS do backend.
* Ter nome iniciado por `amazon-connect-`.
* Estar associado a uma instância Amazon Connect.
* Ter Customer Profiles habilitado.
  Normalmente o domínio criado pelo Amazon Connect possui o formato:
  `amazon-connect-<instance-alias>`.
  Consultar o domínio no Amazon Connect Console em `Instance -> Customer Profiles`.

## Restrições do domínio existente

Não usar:

```ts
domainName: '...'
instanceAlias: '...'
expirationDays: 90
```

`instanceAlias` e `expirationDays` só se aplicam quando o Amplify cria o domínio.
Para domínio existente, a retenção de dados deve ser configurada no Amazon Connect Console.

## Deploy

Executar:

```bash
npx ampx sandbox
```

Após o deploy, verificar `amplify_outputs.json`:

```json
{
  "notifications": {
    "amazon_connect": {
      "endpoint": "https://abcdefghij.execute-api.us-east-1.amazonaws.com",
      "aws_region": "us-east-1"
    }
  }
}
```

O frontend utiliza esses valores ao configurar o Amplify.

# Templates de mensagens

## Conceito

O Amplify provisiona o caminho de entrega, mas não cria o conteúdo das mensagens.
O conteúdo vem de um push message template armazenado em uma knowledge base do Amazon Q in Connect.
A console do Amazon Q in Connect não suporta criação de templates do canal `PUSH`.
Os templates devem ser criados e publicados usando AWS CLI `qconnect` ou a API Amazon Q in Connect.

## Relação template/journey

O nome do template é o vínculo entre o template e a jornada.
O nome do template deve ser exatamente igual ao nome da custom action block da jornada, incluindo maiúsculas e minúsculas.
Se não existir template correspondente, a jornada usa conteúdo placeholder padrão.

## Knowledge Base

No modo de criação automática, `defineNotifications` cria uma knowledge base vazia do tipo `MESSAGE_TEMPLATES` e associa-a à instância Amazon Connect usando a integração `Q_MESSAGE_TEMPLATES`.
No modo de domínio existente, uma knowledge base `MESSAGE_TEMPLATES` deve ser associada à instância Connect existente.

Encontrar o Knowledge Base ID:

```bash
aws connect list-integration-associations \
  --instance-id <INSTANCE_ID> \
  --integration-type Q_MESSAGE_TEMPLATES
```

O `KB_ID` é o último segmento de `IntegrationArn`, no formato `knowledge-base/<KB_ID>`.

## Criar template

```bash
aws qconnect create-message-template \
  --knowledge-base-id <KB_ID> \
  --name 'Push Notification' \
  --channel-subtype PUSH \
  --content '{"push":{"apns":{"title":"Hello {{Attributes.firstName}}","body":{"content":"Your order shipped."}},"fcm":{"title":"Hello {{Attributes.firstName}}","body":{"content":"Your order shipped."}}}}'
```

Conteúdo por plataforma:

* `push.apns`: Apple Push Notification service.
* `push.fcm`: Firebase Cloud Messaging.
  Cada plataforma precisa de `title` e `body`.
  Se uma plataforma não for especificada, utiliza o conteúdo padrão daquela plataforma.

## Publicar alterações

Após cada alteração no conteúdo, criar uma nova versão:

```bash
aws qconnect create-message-template-version \
  --knowledge-base-id <KB_ID> \
  --message-template-id <TEMPLATE_ID>
```

## Personalização

Templates suportam variáveis:

```text
{{Attributes.firstName}}
```

As variáveis são resolvidas usando atributos do Customer Profile, inclusive atributos customizados.
Exemplo:

```text
Hello {{Attributes.firstName}}, your order is on the way.
```

Se o atributo não existir, a variável permanece literal no texto. Portanto, utilizar somente atributos preenchidos de forma consistente e criar mensagens que continuem fazendo sentido quando o valor estiver ausente.

# Amazon Connect Journey

A criação da journey é realizada no Amazon Connect Console.
Somente a criação/publicação do template PUSH é CLI-only.

Passos:

1. Abrir Amazon Connect Console.
2. Acessar `Journeys`.
3. Criar ou abrir uma journey.
4. Adicionar uma `custom action block`.
5. Apontar a action para a Lambda de push delivery criada pelo Amplify.
6. Definir o nome do bloco exatamente igual ao nome do template.
7. Respeitar capitalização.
8. Publicar a journey.

# Checklist de implementação

* [ ] Configurar Amplify Auth.
* [ ] Instalar `@aws-amplify/backend-notifications`.
* [ ] Criar secret APNs se necessário.
* [ ] Criar secret FCM se necessário.
* [ ] Configurar `defineNotifications`.
* [ ] Escolher domínio novo ou existente.
* [ ] Configurar APNs e/ou FCM.
* [ ] Executar `npx ampx sandbox`.
* [ ] Validar `amplify_outputs.json`.
* [ ] Obter Knowledge Base ID.
* [ ] Criar template PUSH com `qconnect`.
* [ ] Publicar versão do template.
* [ ] Criar/configurar Amazon Connect Journey.
* [ ] Adicionar custom action apontando para a Lambda de push delivery.
* [ ] Usar exatamente o mesmo nome entre template e custom action.
* [ ] Publicar a journey.
* [ ] Testar registro de dispositivo e entrega da notificação.

# Regras para o OpenCode

Ao implementar notificações:

1. Não armazenar credenciais APNs/FCM no código.
2. Sempre usar `secret()` para material sensível.
3. Não enviar `principalId` pelo cliente.
4. Usar Cognito Identity Pool e Signature Version 4.
5. Não combinar `domainName` com `instanceAlias` ou `expirationDays`.
6. Validar que domínio existente começa com `amazon-connect-`.
7. Garantir que domínio e aplicação estejam na mesma conta e região.
8. Template PUSH deve ter nome idêntico ao custom action da Journey.
9. Publicar nova versão do template após alterações.
10. Manter `amplify_outputs.json` disponível para a configuração do frontend.
11. Não assumir que o conteúdo da mensagem é criado pelo Amplify.
12. Quando usar domínio existente, preservar os object types existentes.
