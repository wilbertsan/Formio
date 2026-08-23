AWS Amplify In-App Messaging — Next.js

Objetivo

Referência compacta para o OpenCode implementar In-App Messaging. Fluxo: configurar Amplify → inicializar → identificar usuário → sincronizar campanhas → disparar eventos → exibir → tratar interações → limpar → resolver conflitos.

Importante: a documentação atual informa fim do suporte ao Amazon Pinpoint em 30/10/2026 e ausência de novos usuários. Para novas arquiteturas, valide AWS End User Messaging, Amazon Connect, SES e Kinesis.

Integração

Para React/Next.js, a documentação demonstra Amplify UI:

npm add @aws-amplify/ui-react @aws-amplify/ui-react-notifications

import { withInAppMessaging } from '@aws-amplify/ui-react-notifications';
import '@aws-amplify/ui-react/styles.css';
const App = () => (/* aplicação */);
export default withInAppMessaging(App);

Inicialização:

import { Amplify } from 'aws-amplify';
import { initializeInAppMessaging, syncMessages } from 'aws-amplify/in-app-messaging';
import outputs from '../amplify_outputs.json';
Amplify.configure(outputs);
initializeInAppMessaging();
await syncMessages();

Em Next.js, APIs dependentes do navegador devem ficar em Client Components/client-side code; não execute inicialização/listeners em Server Components.

Funcionamento

Campanhas são configuradas no provider.

syncMessages() baixa campanhas para o dispositivo.

Um evento Analytics ou In-App Messaging é disparado.

Nome, atributos e métricas são comparados com a campanha.

Havendo correspondência, a mensagem é exibida.

Listeners tratam recebimento, exibição, dismiss e ação.

Múltiplas correspondências usam a resolução de conflitos.
syncMessages() substitui as mensagens existentes pelas sincronizadas.

Sincronização

import { syncMessages } from 'aws-amplify/in-app-messaging';
await syncMessages();

Pode ser chamado no bootstrap, após login ou em um ponto controlado:

useEffect(() => { syncMessages(); }, []);

Eventos de Analytics

import { record } from 'aws-amplify/analytics';
record({
  name: 'first_event',
  attributes: { color: 'red' },
  metrics: { quantity: 10 }
});

O nome, atributos e métricas devem corresponder aos critérios da campanha.

Eventos de In-App Messaging

import { dispatchEvent } from 'aws-amplify/in-app-messaging';
dispatchEvent({
  name: 'first_event',
  attributes: { color: 'red' },
  metrics: { quantity: 10 }
});

Use para disparos explícitos do fluxo da aplicação.

Identificação e segmentação

import { identifyUser } from 'aws-amplify/in-app-messaging';
await identifyUser({
  userId: 'user-id',
  userProfile: {
    email: 'example@service.com',
    name: 'user-name',
    plan: 'pro',
    customProperties: { hobby: '3d-printing' },
    demographic: {
      appVersion: '1.0.0', locale: 'pt_BR', make: 'Apple',
      model: 'iPhone', modelVersion: '13', platform: 'iOS',
      platformVersion: '15', timezone: 'America/Recife'
    },
    location: {
      city: 'Recife', country: 'BR', region: 'PE',
      postalCode: '00000-000', latitude: 0, longitude: 0
    },
    metrics: { logins: 1 }
  }
});

userProfile suporta identidade, propriedades customizadas, dados demográficos, localização e métricas. Envie apenas dados necessários e respeite LGPD. Para Amazon Pinpoint, options também aceita address, optOut (ALL/NONE) e userAttributes.

Exibição

Após sincronização, uma mensagem aparece quando um evento corresponde a uma campanha ativa. Tanto record() quanto dispatchEvent() podem ser gatilhos.
Amplify UI usa withInAppMessaging; uma UI própria deve usar listeners e notifyMessageInteraction().

Listeners

Recebimento:

import { onMessageReceived } from 'aws-amplify/in-app-messaging';
const listener = onMessageReceived((message) => { /* tratar */ });
listener.remove();

Exibição:

import { onMessageDisplayed } from 'aws-amplify/in-app-messaging';
const listener = onMessageDisplayed((message) => { /* tratar */ });
listener.remove();

Dismiss:

import { onMessageDismissed } from 'aws-amplify/in-app-messaging';
const listener = onMessageDismissed((message) => { /* tratar */ });
listener.remove();

Ação:

import { onMessageActionTaken } from 'aws-amplify/in-app-messaging';
const listener = onMessageActionTaken((message) => { /* tratar */ });
listener.remove();

Sempre remova listeners com .remove() quando não forem mais necessários.

UI customizada

A UI oficial já notifica interações. Em UI própria:

import { notifyMessageInteraction } from 'aws-amplify/in-app-messaging';
notifyMessageInteraction({ message, type: 'messageDisplayed' });

Tipos: messageReceived, messageDisplayed, messageDismissed, messageActionTaken. Isso permite ao provider processar interações e registrar ações correspondentes.

Limpeza

import { clearMessages } from 'aws-amplify/in-app-messaging';
await clearMessages();

Com autenticação, chame entre logins, especialmente em dispositivos compartilhados, para impedir que mensagens de um usuário sejam mostradas a outro.

logout A → clearMessages() → login B → identifyUser() → syncMessages()

Conflitos

Se um evento corresponder a várias mensagens, o padrão ordena por expiração e escolhe a campanha mais próxima de expirar.

import { setConflictHandler } from 'aws-amplify/in-app-messaging';
setConflictHandler((messages) => messages[0]);

O handler recebe um array e deve retornar uma única mensagem. Prefira estratégia determinística baseada em prioridade/contexto.

Arquitetura recomendada

Next.js Client
├─ Amplify.configure(outputs)
├─ initializeInAppMessaging()
├─ identifyUser()       → autenticação
├─ syncMessages()       → bootstrap/login/refresh
├─ record()             → Analytics
├─ dispatchEvent()      → eventos explícitos
├─ withInAppMessaging() → UI oficial
└─ listeners            → UI customizada
Provider
└─ campanhas + segmentação + critérios de evento

Regras para o OpenCode

Use a API modular aws-amplify/in-app-messaging.

APIs principais: initializeInAppMessaging, syncMessages, clearMessages, identifyUser, dispatchEvent, setConflictHandler.

Mantenha APIs dependentes do cliente em Client Components.

Inicialize In-App Messaging uma vez.

Sincronize antes de esperar campanhas.

Após trocar de usuário: clearMessages() → identifyUser() → syncMessages().

Em UI própria, use notifyMessageInteraction.

Remova listeners com .remove().

Evite atributos sensíveis/desnecessários.

Considere a descontinuação do Pinpoint em novas implementações.

Fontes oficiais

https://docs.amplify.aws/nextjs/frontend/in-app-messaging/

https://docs.amplify.aws/nextjs/frontend/in-app-messaging/integrate-application/

https://docs.amplify.aws/nextjs/frontend/in-app-messaging/sync-messages/

https://docs.amplify.aws/nextjs/frontend/in-app-messaging/display-messages/

https://docs.amplify.aws/nextjs/frontend/in-app-messaging/clear-messages/

https://docs.amplify.aws/nextjs/frontend/in-app-messaging/identify-user/

https://docs.amplify.aws/nextjs/frontend/in-app-messaging/respond-interaction-events/

https://docs.amplify.aws/nextjs/frontend/in-app-messaging/resolve-conflicts/