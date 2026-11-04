import type { LegalSection } from './terms'

export type { LegalNode, LegalSection } from './terms'

export const privacyUpdatedAt = 'outubro de 2026'

export const privacySections: LegalSection[] = [
  {
    id: 'introducao',
    number: '1',
    title: 'Introdução',
    children: [
      {
        kind: 'paragraph',
        text: 'A 3DFormio respeita sua privacidade e trata seus dados pessoais conforme esta política e a Lei Geral de Proteção de Dados (LGPD), quando aplicável.',
      },
      {
        kind: 'paragraph',
        text: 'Aqui explicamos quais informações usamos, por que precisamos delas, com quem as compartilhamos e como você pode exercer seus direitos. A 3DFormio é destinada exclusivamente a pessoas com 18 anos completos ou mais. O acesso e o uso da plataforma por menores de 18 anos não são permitidos, mesmo com autorização de pais ou responsáveis.',
      },
    ],
  },
  {
    id: 'controlador',
    number: '2',
    title: 'Quem cuida dos seus dados',
    children: [
      {
        kind: 'paragraph',
        text: 'VFBS AUTOMACAO E SISTEMAS, CNPJ 62.773.386/0001-21, é a empresa responsável pela 3DFormio e pelo tratamento de dados usado para operar sua conta, compras, conteúdo e atendimento.',
      },
      {
        kind: 'paragraph',
        text: 'Para privacidade e LGPD, escreva para [e-mail de privacidade]. Para atendimento de compras e entrega, use [e-mail de atendimento].',
      },
    ],
  },
  {
    id: 'dados',
    number: '3',
    title: 'Quais dados usamos',
    children: [
      {
        kind: 'list',
        items: [
          'Conta: nome, e-mail, identificação da conta, plano e idioma.',
          'Compra física: CPF/CNPJ, nome do destinatário, telefone, endereço e dados de entrega, frete, itens escolhidos e registros do pedido.',
          'Perfil de entrega salvo: informações que você escolhe guardar para facilitar compras futuras.',
          'Pagamento: identificação da transação, situação do pagamento, valores, moeda, reembolsos e contestações. Os dados completos de cartão são tratados pelo provedor de pagamento, não armazenados pela 3DFormio.',
          'Conteúdo do Editor 3D: imagens, textos, instruções, configurações e arquivos que você envia ou cria. Na Biblioteca, tratamos informações de acesso, downloads, denúncias e publicação. Apenas criações feitas no Grátis ou Pro podem ser usadas para alimentar o Acervo e a Biblioteca, conforme os Termos de Uso. Criações próprias feitas no Business não são publicadas.',
          'Uso e segurança: endereço IP, navegador, registros de acesso, downloads e informações necessárias para identificar falhas e proteger o serviço.',
          'Atendimento: mensagens, anexos, denúncias e solicitações de privacidade.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Cookies opcionais e dados de publicidade são usados conforme sua escolha, quando esse controle estiver disponível.',
      },
    ],
  },
  {
    id: 'pagamento-entrega',
    number: '4',
    title: 'Dados de pagamento e entrega',
    children: [
      {
        kind: 'paragraph',
        text: 'No Pix Automático de assinaturas, nome e CPF/CNPJ podem ser enviados ao provedor de pagamento e ao prestador de emissão fiscal sem que a 3DFormio guarde esses identificadores fiscais nesse fluxo.',
      },
      {
        kind: 'paragraph',
        text: 'Nas compras físicas, guardamos CPF/CNPJ, destinatário, telefone e endereço junto ao pedido para pagamento, entrega, documentos fiscais quando aplicável, atendimento, prevenção de fraude e solução de disputas.',
      },
      {
        kind: 'paragraph',
        text: 'Salvar um perfil de entrega é opcional. Você pode editar ou apagar esse perfil para as próximas compras. Isso não muda nem apaga os dados dos pedidos já feitos, que podem precisar ser mantidos pelos motivos explicados nesta política.',
      },
    ],
  },
  {
    id: 'finalidades',
    number: '5',
    title: 'Para que usamos seus dados',
    children: [
      {
        kind: 'list',
        items: [
          'Criar e gerenciar sua conta, plano e acesso aos arquivos.',
          'Processar pagamentos, compras, frete, entrega, documentos fiscais, cancelamentos, devoluções e reembolsos.',
          'Gerar e disponibilizar os arquivos solicitados. Para publicação de criações do Editor no Acervo e na Biblioteca, usamos apenas criações Grátis e Pro, conforme os Termos de Uso.',
          'Prestar atendimento e enviar avisos sobre sua conta ou pedido.',
          'Prevenir fraude, cópia automatizada indevida, tentativas de contornar limites e incidentes de segurança.',
          'Cumprir obrigações legais e contratuais e defender direitos. Medir publicidade e enviar marketing quando houver autorização aplicável.',
        ],
      },
    ],
  },
  {
    id: 'compartilhamento',
    number: '6',
    title: 'Com quem compartilhamos informações',
    children: [
      {
        kind: 'paragraph',
        text: 'Não vendemos dados pessoais. Compartilhamos somente informações necessárias às finalidades descritas aqui, como pagamento, entrega, armazenamento, acesso à conta, atendimento, emissão fiscal, segurança e obrigações legais.',
      },
      {
        kind: 'paragraph',
        text: 'Prestadores de pagamento, frete, hospedagem, armazenamento, autenticação e e-mail podem tratar dados em nosso nome. Alguns também são responsáveis por tratamentos próprios, como verificação de identidade, prevenção de fraude, contestação de pagamentos e cumprimento de obrigações legais.',
      },
      {
        kind: 'paragraph',
        text: 'Nos recursos que usam inteligência artificial, imagens e instruções podem ser enviadas a prestadores de inteligência artificial e processamento de imagens, como serviços acessados por OpenRouter. Isso serve para gerar ou aprimorar o resultado solicitado e, no Acervo/Biblioteca, analisar conteúdo e direitos. Esses prestadores podem processar dados fora do Brasil. Não envie dados pessoais desnecessários ou conteúdo que não esteja autorizado a usar.',
      },
      {
        kind: 'paragraph',
        text: 'Dados de entrega, CPF/CNPJ, imagens enviadas, arquivos originais e anexos de atendimento não são enviados às ferramentas de publicidade e análise de audiência.',
      },
    ],
  },
  {
    id: 'cookies',
    number: '7',
    title: 'Cookies e publicidade: sua escolha',
    children: [
      {
        kind: 'paragraph',
        text: 'Cookies essenciais são necessários para login, segurança, idioma e funcionamento. Cookies opcionais de análise de audiência e publicidade ficam desativados até você aceitar.',
      },
      {
        kind: 'paragraph',
        text: 'Enquanto o controle dedicado de preferências não estiver disponível, você pode solicitar a revisão da sua escolha pelos canais de privacidade. Recusar os cookies opcionais não impede compras nem o uso das funções essenciais.',
      },
      {
        kind: 'paragraph',
        text: 'Podemos usar ferramentas de Google, Meta, TikTok e Cloudflare conforme a finalidade e sua autorização. Sem autorização para publicidade, não ativamos os dados opcionais de publicidade.',
      },
    ],
  },
  {
    id: 'retencao',
    number: '8',
    title: 'Por quanto tempo guardamos os dados',
    children: [
      {
        kind: 'paragraph',
        text: 'O tempo de conservação depende da finalidade e da obrigação aplicável a cada tipo de dado: conta, perfil de entrega, pedidos, pagamentos, documentos fiscais, atendimento, registros de acesso, arquivos e solicitações de privacidade.',
      },
      {
        kind: 'paragraph',
        text: 'Você pode pedir a exclusão de seus dados quando cabível. Alguns registros podem precisar ser mantidos para cumprir a lei, resolver uma disputa, apurar fraude ou incidente de segurança, cumprir ordem judicial ou defender direitos. Explicaremos as razões aplicáveis ao seu pedido.',
      },
      {
        kind: 'paragraph',
        text: 'Os registros de acesso são confidenciais e têm acesso restrito. São mantidos pelo prazo legal aplicável ou pelo tempo necessário a uma finalidade justificada, como investigação ou disputa, sem conservação indefinida por conveniência.',
      },
      {
        kind: 'paragraph',
        text: 'Arquivos e conteúdo seguem também os direitos de cada plano descritos nos Termos. Apagar a conta não desfaz automaticamente licenças de compartilhamento já concedidas sobre conteúdo Grátis/Pro publicado na Biblioteca; pedidos de retirada serão analisados conforme os direitos e a legislação aplicáveis.',
      },
      {
        kind: 'list',
        items: [
          'Conta: enquanto você mantiver a conta, para acesso e atendimento. Após o encerramento, conservamos apenas informações necessárias a uma obrigação legal, segurança ou disputa justificada.',
          'Perfil de entrega: guardado até você editar ou excluir o perfil, ou até a exclusão aplicável da conta. Os dados dos pedidos anteriores seguem a regra própria dos pedidos.',
          'Pedidos, pagamentos e documentos fiscais: mantidos pelo tempo necessário às obrigações fiscais e contratuais, ao atendimento e ao exercício de direitos. Um pedido de exclusão será analisado considerando essas obrigações e eventual disputa.',
          'Editor 3D: arquivos temporários de geração e download têm validade limitada indicada no fluxo e não são um serviço permanente de armazenamento. Conteúdos salvos na conta seguem o uso do recurso e os pedidos de exclusão aplicáveis.',
          'Biblioteca e Acervo: criações Grátis e Pro já publicadas podem continuar disponíveis conforme a autorização de compartilhamento dada nesses planos. Registros de acesso e permissões são guardados enquanto necessários para controle de uso, atendimento e defesa de direitos. As criações próprias feitas no Business ficam fora da Biblioteca, inclusive após o fim da assinatura.',
          'Cookies e publicidade: a escolha de consentimento pode ser revista pelos canais de privacidade enquanto o controle dedicado não estiver disponível. A revogação interrompe novos usos opcionais; registros anteriores são analisados conforme sua finalidade e obrigações aplicáveis.',
          'Atendimento e privacidade: informações conservadas durante a análise e pelo período necessário para comprovar a resposta e resolver questões vinculadas ao caso.',
          'Registros de acesso e segurança: pelo prazo legal aplicável e por período adicional apenas quando houver motivo específico, como fraude, incidente, investigação ou disputa. Registros necessários a um caso em andamento ficam preservados até cessar essa necessidade; isso não autoriza guardar todos os dados indefinidamente.',
        ],
      },
    ],
  },
  {
    id: 'direitos',
    number: '9',
    title: 'Seus direitos e como pedir atendimento',
    children: [
      {
        kind: 'paragraph',
        text: 'Quando a LGPD se aplica, você pode saber se usamos seus dados, pedir acesso e correção, conhecer os compartilhamentos e solicitar anonimização, bloqueio, exclusão ou portabilidade quando cabíveis. Também pode revogar consentimentos e pedir revisão de decisões automatizadas quando aplicável.',
      },
      {
        kind: 'paragraph',
        text: 'Escreva para [e-mail de privacidade]. Podemos solicitar informações proporcionais para confirmar sua identidade e proteger seus dados. Responderemos com as medidas adotadas ou os motivos que impeçam o atendimento integral.',
      },
      {
        kind: 'paragraph',
        text: 'Pedidos de confirmação ou acesso aos dados podem ser atendidos de forma simplificada imediatamente. Quando for necessária uma declaração completa, o prazo legal é de até 15 dias contados da solicitação. Esse prazo não é uma regra única para todos os tipos de pedido de privacidade.',
      },
    ],
  },
  {
    id: 'seguranca',
    number: '10',
    title: 'Segurança, incidentes e denúncias',
    children: [
      {
        kind: 'paragraph',
        text: 'Adotamos medidas de segurança e acesso restrito para proteger informações. Se houver um incidente com dados pessoais que gere risco ou dano relevante, avaliaremos o ocorrido e as comunicações exigidas aos afetados e às autoridades.',
      },
      {
        kind: 'paragraph',
        text: 'Denúncias de violação de direitos podem exigir análise do conteúdo, contato com os envolvidos, restrição ou remoção do item e conservação dos registros necessários à apuração.',
      },
      {
        kind: 'paragraph',
        text: 'Podemos guardar registros de aceites, downloads, permissões de acesso, pedidos e atendimentos para comprovar fatos e resolver disputas, usando apenas as informações necessárias.',
      },
    ],
  },
  {
    id: 'transferencia',
    number: '11',
    title: 'Tratamento fora do Brasil e idiomas',
    children: [
      {
        kind: 'paragraph',
        text: 'Alguns prestadores podem processar dados fora do Brasil. Nessas transferências internacionais, adotamos medidas contratuais e de segurança compatíveis com a finalidade e a legislação aplicável.',
      },
      {
        kind: 'paragraph',
        text: 'Para relações brasileiras, prevalece a versão em português do Brasil. Inglês e espanhol são traduções para facilitar a leitura, respeitada a legislação aplicável.',
      },
    ],
  },
  {
    id: 'contato',
    number: '12',
    title: 'Contato',
    children: [
      {
        kind: 'paragraph',
        text: 'Privacidade, LGPD e direitos sobre seus dados: [e-mail de privacidade]. Compras físicas, entrega e atendimento do pedido: [e-mail de atendimento].',
      },
    ],
  },
]
