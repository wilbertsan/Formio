AWS Amplify Gen 2 — REST/HTTP API

1. Dependências e estrutura

npm add aws-amplify @aws-amplify/backend aws-cdk-lib
`resource.ts` declara a Lambda; `handler.ts` implementa a lógica HTTP; `backend.ts` cria API Gateway, rotas, auth, IAM, CORS e outputs.
## 2. Function
```ts
import { defineFunction } from "@aws-amplify/backend";
export const myApiFunction = defineFunction({ name: "api-function" });
```ts
import type { APIGatewayProxyHandler } from "aws-lambda";
export const handler: APIGatewayProxyHandler = async () => ({
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
  },
  body: JSON.stringify("Hello from api-function!"),
});
## 3. REST API
```ts
const backend = defineBackend({ auth, data, myApiFunction });
const apiStack = backend.createStack("api-stack");
const integration = new LambdaIntegration(
  backend.myApiFunction.resources.lambda
);
const api = new RestApi(apiStack, "RestApi", { restApiName: "myRestApi" });
const items = api.root.addResource("items");
items.addMethod("GET", integration);
items.addMethod("POST", integration);
items.addMethod("PUT", integration);
items.addMethod("DELETE", integration);
items.addProxy({ anyMethod: true, defaultIntegration: integration });
`addProxy` atende subrotas/caminhos dinâmicos.
## 4. HTTP API
```ts
const integration = new HttpLambdaIntegration(
  "LambdaIntegration", backend.myApiFunction.resources.lambda
);
const httpApi = new HttpApi(apiStack, "HttpApi", {
  apiName: "myHttpApi",
  createDefaultStage: true,
  corsPreflight: {
    allowMethods: [
      CorsHttpMethod.GET, CorsHttpMethod.POST,
      CorsHttpMethod.PUT, CorsHttpMethod.DELETE
    ],
    allowOrigins: ["*"],
    allowHeaders: ["*"],
  },
});
httpApi.addRoutes({
  path: "/items",
  methods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE],
  integration,
  authorizer: iamAuthorizer,
});
httpApi.addRoutes({
  path: "/items/{proxy+}",
  methods: [HttpMethod.ANY],
  integration,
  authorizer: iamAuthorizer,
});
## 5. CORS
Configure CORS no API Gateway e, quando necessário, na resposta Lambda:
```ts
headers: {
  "Access-Control-Allow-Origin": "https://app.example.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
}
## 6. IAM Authorization
IAM pode assinar requisições automaticamente. Há papéis autenticados e não autenticados.
```ts
const policy = new Policy(apiStack, "ApiPolicy", {
  statements: [new PolicyStatement({
    actions: ["execute-api:Invoke"],
    resources: [
      `${api.arnForExecuteApi("*", "/items")}`,
      `${api.arnForExecuteApi("*", "/items/*")}`,
    ],
  })],
});
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(policy);
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(policy);
## 7. Cognito User Pools
```ts
const cognitoAuth = new CognitoUserPoolsAuthorizer(
  apiStack, "CognitoAuth", {
    cognitoUserPools: [backend.auth.resources.userPool],
  }
);
items.addMethod("GET", integration, {
  authorizationType: AuthorizationType.COGNITO,
  authorizer: cognitoAuth,
});
Frontend:
```ts
import { fetchAuthSession } from "aws-amplify/auth";
const session = await fetchAuthSession();
const idToken = session.tokens?.idToken;
const accessToken = session.tokens?.accessToken;
## 8. API Key
```ts
Amplify.configure(outputs, {
  API: { REST: {
    headers: async () => ({ "X-Api-Key": apiKey }),
  }},
});
## 9. Token customizado
Global:
```ts
Amplify.configure(outputs, {
  API: { REST: {
    headers: async () => ({ Authorization: customAuthToken }),
  }},
});
Por chamada:
```ts
await del({
  apiName: "myRestApi",
  path: "items/1",
  options: { headers: { Authorization: authToken } },
}).response;
## 10. API pública sem IAM
Por requisição:
```ts
await get({
  apiName: "myApi",
  path: "/public-endpoint",
  options: { defaultAuthMode: "none" },
});
Global:
```ts
Amplify.configure(outputs, {
  API: { REST: { defaultAuthMode: "none" } },
});
## 11. Configuração do frontend
```ts
import { Amplify } from "aws-amplify";
import { parseAmplifyConfig } from "aws-amplify/utils";
import outputs from "@/amplify_outputs.json";
const amplifyConfig = parseAmplifyConfig(outputs);
Amplify.configure({
  ...amplifyConfig,
  API: { ...amplifyConfig.API, REST: outputs.custom.API },
});
Configure antes das chamadas. Sem isso podem ocorrer `API name is invalid` ou `NoCredentials`. O `apiName` deve corresponder ao nome registrado.
## 12. Retry
```ts
Amplify.configure(config, {
  API: { REST: { retryStrategy: { strategy: "no-retry" } } },
});
## 13. Outputs
REST:
```ts
backend.addOutput({
  custom: { API: {
    [api.restApiName]: {
      endpoint: api.url,
      region: Stack.of(api).region,
      apiName: api.restApiName,
    },
  }},
});
HTTP API: use `httpApi.httpApiName` e `httpApi.url`.
## 14. API Gateway existente
```ts
import { Amplify } from "aws-amplify";
import { parseAmplifyConfig } from "aws-amplify/utils";
import outputs from "../amplify_outputs.json";
const config = parseAmplifyConfig(outputs);
Amplify.configure({
  ...config,
  API: {
    ...config.API,
    REST: {
      ...config.API?.REST,
      YourAPIName: {
        endpoint:
          "https://abcdefghij1234567890.execute-api.us-east-1.amazonaws.com/stageName",
        region: "us-east-1",
      },
    },
  },
});
## 15. Chamadas REST
```ts
const response = await get({
  apiName: "myApi", path: "/items",
}).response;
const data = await response.body.json();
```ts
await post({
  apiName: "myApi",
  path: "/items",
  options: { body: { name: "item" } },
}).response;
## 17. REST vs HTTP API
**REST API:** escolha quando precisar dos recursos específicos do API Gateway REST API, modelo tradicional de recursos/métodos ou integrações compatíveis.
**HTTP API:** escolha para APIs HTTP mais simples, rotas explícitas e `HttpLambdaIntegration`.
## 18. Checklist
- [ ] Instalar dependências.
- [ ] Criar Function e handler.
- [ ] Criar stack API.
- [ ] Criar REST ou HTTP API.
- [ ] Integrar Lambda.
- [ ] Criar rotas/métodos.
- [ ] Configurar CORS.
- [ ] Definir autorização.
- [ ] Criar IAM policies quando necessárias.
- [ ] Adicionar outputs.
- [ ] Configurar `Amplify.configure()`.
- [ ] Validar `apiName`.
## 19. Referências oficiais
- REST API: https://docs.amplify.aws/nextjs/build-a-backend/add-aws-services/rest-api/
- REST setup: https://docs.amplify.aws/nextjs/build-a-backend/add-aws-services/rest-api/set-up-rest-api/
- HTTP setup: https://docs.amplify.aws/nextjs/build-a-backend/add-aws-services/rest-api/set-up-http-api/
- Auth: https://docs.amplify.aws/nextjs/build-a-backend/add-aws-services/rest-api/customize-authz/
- Existing resources: https://docs.amplify.aws/nextjs/build-a-backend/add-aws-services/rest-api/existing-resources/
- Reference: https://docs.amplify.aws/nextjs/build-a-backend/add-aws-services/rest-api/ref