AWS Amplify Gen 2 --- REST API com Next.js

Objetivo

Documentação de referência para implementar, consumir, testar e tratar
erros de APIs REST em uma aplicação Next.js usando AWS Amplify Gen 2 e o
pacote aws-amplify/api.

Visão geral

O módulo REST API do Amplify fornece funções HTTP para consumir
endpoints REST, normalmente associados ao Amazon API Gateway. A API
funcional do Amplify usa imports individuais como get, post, put,
patch e del, favorecendo tree-shaking e bundles menores. Operações
suportadas neste padrão: GET, POST, PUT, PATCH, DELETE, além de HEAD. A
entrada comum usa apiName, path e, opcionalmente, options com
headers, queryParams, body e withCredentials.

Importação

import { get, post, put, patch, del, head, ApiError } from 'aws-amplify/api';

Use apenas as funções necessárias no arquivo. O backend precisa estar
configurado no Amplify e o apiName deve corresponder ao nome da API
registrada na configuração da aplicação.

Estrutura de uma operação

const restOperation = get({
  apiName: 'myRestApi',
  path: 'items',
  options: {
    headers: {},
    queryParams: {},
    retryStrategy: {
      strategy: 'jittered-exponential-backoff'
    }
  }
});
const response = await restOperation.response;

apiName identifica a API; path identifica a rota; headers envia
cabeçalhos HTTP; queryParams envia parâmetros de consulta; body
envia dados para métodos que aceitam corpo; withCredentials permite
requisições cross-site com credenciais quando necessário.

GET --- buscar dados

import { get } from 'aws-amplify/api';

async function getItems() {
  try {
    const operation = get({
      apiName: 'myRestApi',
      path: 'items',
      options: {
        queryParams: { id: '123' }
      }
    });
    const response = await operation.response;
    return await response.body.json();
  } catch (error) {
    console.error('GET failed', error);
  }
}

Parâmetros de consulta devem ser enviados em options.queryParams, por
exemplo { id: '123' }. Não monte manualmente a query string quando
queryParams puder representar os parâmetros.

Consumindo a resposta

A resposta REST possui statusCode, headers e body. O corpo pode
ser consumido como JSON, texto ou Blob:

const { body } = await operation.response;
const json = await body.json();
// ou: await body.text()
// ou: await body.blob()

O payload da resposta só pode ser consumido uma vez. Escolha o formato
adequado ao endpoint antes de ler body.

Retry

Operações podem configurar retryStrategy:

options: {
  retryStrategy: {
    strategy: 'no-retry'
  }
}

Estratégias documentadas: - no-retry: uma única tentativa; falha
imediatamente. - jittered-exponential-backoff: estratégia padrão, com
atrasos crescentes e até 3 tentativas. Para operações em que repetição
possa gerar efeitos colaterais, avalie cuidadosamente a política de
retry.

POST --- criar/enviar dados

POST envia um corpo JSON:

import { post } from 'aws-amplify/api';

async function createItem() {
  const operation = post({
    apiName: 'myRestApi',
    path: 'items',
    options: {
      body: {
        message: 'Mow the lawn'
      }
    }
  });
  const { body } = await operation.response;
  return await body.json();
}

Use headers quando o endpoint exigir cabeçalhos específicos.
queryParams pode ser combinado com body.

PUT --- atualizar/substituir dados

import { put } from 'aws-amplify/api';

async function updateItem(id: string) {
  const operation = put({
    apiName: 'myRestApi',
    path: `items/${id}`,
    options: {
      body: {
        name: 'Updated item'
      }
    }
  });
  const { body } = await operation.response;
  return await body.json();
}

PUT é apropriado quando o contrato do backend define
atualização/substituição do recurso. O corpo e os parâmetros devem
seguir o contrato da API.

PATCH --- atualização parcial

import { patch } from 'aws-amplify/api';

async function patchItem(id: string) {
  const operation = patch({
    apiName: 'myRestApi',
    path: `items/${id}`,
    options: {
      body: {
        name: 'New name'
      }
    }
  });
  const { body } = await operation.response;
  return await body.json();
}

Use PATCH quando o endpoint representar alteração parcial de um recurso.

DELETE --- remover dados

import { del } from 'aws-amplify/api';

async function deleteItem(id: string) {
  const operation = del({
    apiName: 'myRestApi',
    path: `items/${id}`
  });
  await operation.response;
}

DELETE normalmente não exige leitura do corpo da resposta. Em caso de
retorno com payload, ele pode ser processado a partir de
response.body.

Tratamento de erros

Respostas HTTP com status acima de 299 geram ApiError. O erro pode
conter name, message e, quando o problema veio de uma resposta HTTP,
response:

import { ApiError, get } from 'aws-amplify/api';

try {
  const operation = get({
    apiName: 'myRestApi',
    path: 'items'
  });
  await operation.response;
} catch (error) {
  if (error instanceof ApiError) {
    if (error.response) {
      const { statusCode, headers, body } = error.response;
      console.error(statusCode, headers, body);
    }
  } else {
    console.error('Unexpected error', error);
  }
}

Não presuma que todo erro possui response; trate também erros que não
foram causados por uma resposta HTTP.

Padrão recomendado para serviços

Centralize chamadas REST em funções de serviço, evitando chamadas
espalhadas pelos componentes:

import { get, post, put, del } from 'aws-amplify/api';

export async function listItems() {
  const operation = get({ apiName: 'myRestApi', path: 'items' });
  const { body } = await operation.response;
  return body.json();
}

Componentes devem consumir funções como listItems, createItem,
updateItem e deleteItem, deixando detalhes de API, tratamento e
transformação de respostas no serviço.

Headers e autenticação

Quando necessário, envie cabeçalhos em options.headers:

const operation = get({
  apiName: 'myRestApi',
  path: 'items',
  options: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

A biblioteca pode criar requisições assinadas para Amazon API Gateway
quando a autorização da API estiver configurada com mecanismos
compatíveis, como AWS IAM ou Cognito User Pools. Não coloque segredos,
tokens permanentes ou credenciais AWS diretamente no código do frontend.

Teste via terminal

Se a API permitir acesso de convidados não autenticados, ela pode ser
testada com curl:

curl <your-api-endpoint>/<your-api-stage>/items

POST:

curl -H "Content-Type: application/json"   -d '{"name":"item-1"}'   <your-api-endpoint>/<your-api-stage>/items

Use o endpoint e o stage reais da API. APIs protegidas exigem o
mecanismo de autenticação correspondente; não trate um endpoint privado
como se fosse público.

Teste no API Gateway

No console do Amazon API Gateway: 1. Abra a REST API correspondente. 2.
Em Resources, selecione a rota, por exemplo /items. 3. Selecione o
método, como GET. 4. Use TEST. 5. Para query string, informe parâmetros
como limit=10. 6. Execute e analise request, latency, status, response
body, response headers e logs. A estrutura típica de recursos pode
conter GET, POST, PUT, PATCH, DELETE e OPTIONS. OPTIONS é relevante para
preflight CORS.

Checklist para implementação

Confirmar apiName e path.

Usar imports de aws-amplify/api.

Definir contrato de request/response.

Usar queryParams para parâmetros de consulta.

Usar body para payloads de POST/PUT/PATCH.

Tratar ApiError e status HTTP.

Consumir response.body apenas uma vez.

Definir retry de acordo com a idempotência da operação.

Não expor credenciais ou segredos no frontend.

Testar endpoints com API Gateway e/ou curl.

Validar CORS e OPTIONS para chamadas originadas pelo navegador.

Centralizar acesso à API em uma camada de serviço.

Compatibilidade com Amplify v6

No padrão funcional atual, use get, post, put, patch, del e
head diretamente de aws-amplify/api. Evite exemplos antigos baseados
em API.get, API.post ou API.del quando o projeto utiliza a API
funcional moderna.

Referências oficiais

AWS Amplify Gen 2 --- REST API

Fetch data --- GET, query parameters, response body, retry e
ApiError

Post data --- POST com JSON

Update data --- PUT/PATCH

Delete data --- DELETE

Test the REST API --- curl e Amazon API Gateway Console