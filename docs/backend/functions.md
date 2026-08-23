AWS Amplify Gen 2 — Functions (Next.js)

Objetivo

Guia para implementar, configurar, integrar, agendar, monitorar e estender AWS Lambda Functions em Amplify Gen 2. A definição padrão usa defineFunction.

1. Estrutura

amplify/
├── backend.ts
└── functions/
    └── say-hello/
        ├── resource.ts
        └── handler.ts

resource.ts define a infraestrutura e handler.ts a execução.

import { defineFunction } from "@aws-amplify/backend";
export const sayHello = defineFunction({name:"say-hello",entry:"./handler.ts"});

import type { Handler } from "aws-lambda";
export const handler: Handler = async () => "Hello, World!";

O handler deve exportar handler. Registre em amplify/backend.ts:

import { defineBackend } from "@aws-amplify/backend";
import { sayHello } from "./functions/say-hello/resource";
defineBackend({ sayHello });

npx ampx sandbox e o deploy do Amplify incluem a Function. Para lógica chamada pelo frontend, prefira custom query/mutation do Amplify Data.

2. Configuração

defineFunction aceita:

name: nome explícito; padrão deriva do diretório/entry.

entry: caminho do handler; padrão ./handler.ts.

timeoutSeconds: padrão 3s; máximo 15 min.

memoryMB: padrão 512 MB; 128–10240 MB.

ephemeralStorageSizeMB: padrão 512 MB; 512–10240 MB.

runtime: seleção da versão Node suportada.

export const processor = defineFunction({
  name:"processor",entry:"./handler.ts",timeoutSeconds:60,
  memoryMB:1024,ephemeralStorageSizeMB:1024,runtime:20
});

Memória e armazenamento maiores podem aumentar custos.

3. Variáveis de ambiente

Use environment somente para valores não secretos:

export const fn = defineFunction({
  environment:{NAME:"World",API_ENDPOINT:process.env.API_ENDPOINT}
});

Variáveis específicas por branch do Amplify Hosting podem ser repassadas para a Function.
Nunca coloque senhas, tokens ou chaves privadas em environment: valores podem aparecer em .amplify/artifacts e eventos CloudFormation.

4. Ambiente tipado

Amplify gera env:

import { env } from "$amplify/env/say-hello";
export const handler = async () => `Hello, ${env.NAME}!`;

Os tipos são gerados em .amplify/generated/env/<function-name>.ts durante ampx sandbox/ampx pipeline-deploy.
Projetos create-amplify já configuram $amplify. Em projetos manuais, amplify/tsconfig.json deve mapear $amplify/* para ../.amplify/generated/*.

5. Secrets

Use secret() para API keys, senhas e credenciais:

import { defineFunction, secret } from "@aws-amplify/backend";
export const fn = defineFunction({
  environment:{API_KEY:secret("MY_API_KEY")}
});

O valor é obtido em runtime e disponibilizado em memória:

import { env } from "$amplify/env/fn";
export const handler = async () => env.API_KEY;

6. Amplify client dentro da Function

Para usar aws-amplify com credenciais do runtime Lambda:

import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Amplify } from "aws-amplify";
import { env } from "$amplify/env/my-function";
const {resourceConfig,libraryOptions}=await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig,libraryOptions);

A configuração usa informações do backend e credenciais do IAM role. O schema depende de um bucket S3 criado pelo deployment; não altere esse bucket fora do processo do Amplify.

7. Acesso a recursos Amplify

Prefira access para permissões entre recursos:

export const storage = defineStorage({
  name:"reports",
  access:(allow)=>({
    "reports/*":[allow.resource(generateReports).to(["read","write","delete"])]
  })
});

O Amplify disponibiliza variáveis tipadas como REPORTS_BUCKET_NAME no env, que podem ser usadas pelo AWS SDK.
Use access para Data, Storage, Auth e outros recursos quando a API suportar a permissão desejada.

8. CDK e IAM

Quando access não for suficiente, estenda o execution role:

const backend=defineBackend({myFunction});
const lambda=backend.myFunction.resources.lambda;
lambda.addToRolePolicy(new iam.PolicyStatement({
  actions:["sns:Publish"],resources:["arn:aws:sns:REGION:ACCOUNT:topic"]
}));

O execution role controla os recursos que a Lambda acessa. Prefira métodos grant* dos constructs quando disponíveis e aplique menor privilégio.

9. Agendamento

Schedules usam Amazon EventBridge Rules:

export const weeklyDigest=defineFunction({
  name:"weekly-digest",schedule:"every week"
});

Múltiplos schedules:

schedule:["every week","every month","every year"]

Intervalo:

schedule:"every 1h"

Cron:

schedule:"0 17 ? * 3 *"

Linguagem natural suporta day, week, month, year, m e h, com prefixo every.
Handler agendado:

import type { EventBridgeHandler } from "aws-lambda";
export const handler:EventBridgeHandler<"Scheduled Event",null,void>=
  async(event)=>console.log(JSON.stringify(event));

Tipos:

npm add --save-dev @types/aws-lambda

10. Logs

No Sandbox:

npx ampx sandbox --stream-function-logs

Filtre por nome/regex:

npx ampx sandbox --stream-function-logs --logs-filter auth

O streaming é específico do Sandbox e acelera o debugging.

11. Lambda Layers

Layers separam dependências do código, permitem compartilhamento e podem reduzir pacotes:

export const fn=defineFunction({
  name:"fn",
  layers:{
    "@aws-lambda-powertools/logger":
    "arn:aws:lambda:us-east-1:ACCOUNT:layer:AWSLambdaPowertoolsTypeScriptV2:12"
  }
});

Crie o layer na AWS Console/CLI e informe o ARN. Valide runtime/região. Layers não são configurados por defineFunction em Custom Functions.

12. Exemplos e eventos

Padrões oficiais incluem Auth Pre Sign-up, Post Authentication, Pre Token Generation, validação de atributos, Custom Message, Google reCAPTCHA, Kinesis Data Streams, DynamoDB Streams, confirmação de upload S3 e Custom Auth Challenge.
Use eventos/triggers para processamento orientado a eventos e custom queries/mutations para operações de negócio chamadas pela aplicação.

13. Custom Functions

Gen 2 permite Lambda em Node.js, Python, Go e outras linguagens suportadas. Custom Functions usam CDK diretamente.
Para Custom Functions, environment/secrets, schedule, layers e opções padrão de defineFunction devem ser configurados no construct CDK; resourceGroupName continua disponível.
Exemplo Python:

export const fn=defineFunction(scope=>new Function(scope,"fn",{
  handler:"index.handler",runtime:Runtime.PYTHON_3_9,
  timeout:Duration.seconds(20),code:Code.fromAsset(functionDir)
}));

import json
def handler(event,context):
    return {"statusCode":200,"body":json.dumps({"message":"Hello World"})}

Dependências Python podem ficar em requirements.txt e ser instaladas durante bundling. Custom Functions são indicadas para runtimes, builds ou bundling específicos.

14. Modificar Lambda com CDK

Amplify Functions utilizam NodejsFunction. Após registrar a Function:

const backend=defineBackend({myFunction});
const lambda=backend.myFunction.resources.lambda;

Esse recurso pode ser estendido/sobrescrito via CDK. Evite alterações que conflitem com o gerenciamento declarativo do Amplify.

15. Arquitetura recomendada

Next.js
  |
  +--> Amplify Data/Auth/Storage/API
  |
  +--> Query/Mutation ----+
  |                       |
  +--> Eventos ---------->Lambda
                           |
                 +---------+---------+
                 |         |         |
                Data      S3/AWS    APIs
                           |
                       CloudWatch

Jobs recorrentes:

EventBridge -> Lambda -> processamento -> Data/Storage/APIs

16. Boas práticas

Uma pasta por domínio em amplify/functions.

resource.ts para infraestrutura; handler para lógica.

Usar env para acesso tipado.

Usar secret() para credenciais.

Preferir access antes de CDK/IAM manual.

Aplicar menor privilégio.

Usar query/mutation para operações de negócio.

Usar EventBridge para jobs recorrentes.

Ativar streaming de logs no desenvolvimento.

Usar Layers para dependências compartilhadas/pesadas.

Ajustar memória/timeout/storage conforme necessidade.

Testar com npx ampx sandbox antes do deploy.

17. Checklist

Criar resource.ts e handler.ts.

Registrar a Function em amplify/backend.ts.

Definir entry, timeout e memória quando necessário.

Não armazenar secrets em environment.

Criar secrets e acessar via env.

Configurar access mínimo necessário.

Usar CDK para permissões não cobertas.

Configurar schedule para jobs recorrentes.

Validar layers, runtime e região.

Ativar --stream-function-logs.

Executar npx ampx sandbox.

Testar integrações e IAM antes da produção.

Referências oficiais

https://docs.amplify.aws/nextjs/build-a-backend/functions/

https://docs.amplify.aws/nextjs/build-a-backend/functions/set-up-function/

https://docs.amplify.aws/nextjs/build-a-backend/functions/environment-variables-and-secrets/

https://docs.amplify.aws/nextjs/build-a-backend/functions/configure-functions/

https://docs.amplify.aws/nextjs/build-a-backend/functions/configure-client-library/

https://docs.amplify.aws/nextjs/build-a-backend/functions/scheduling-functions/

https://docs.amplify.aws/nextjs/build-a-backend/functions/streaming-logs/

https://docs.amplify.aws/nextjs/build-a-backend/functions/add-lambda-layers/

https://docs.amplify.aws/nextjs/build-a-backend/functions/grant-access-to-other-resources/

https://docs.amplify.aws/nextjs/build-a-backend/functions/examples/

https://docs.amplify.aws/nextjs/build-a-backend/functions/modify-resources-with-cdk/

https://docs.amplify.aws/nextjs/build-a-backend/functions/custom-functions/