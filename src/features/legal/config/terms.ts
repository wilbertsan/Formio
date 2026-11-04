export type LegalNode =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | {
      kind: 'subsection'
      id: string
      number: string
      title: string
      children: LegalNode[]
    }

export interface LegalSection {
  id: string
  number: string
  title: string
  children: LegalNode[]
}

export const termsUpdatedAt = '3 de novembro de 2026'

export const termsSections: LegalSection[] = [
  {
    id: 'sobre',
    number: '1',
    title: 'Sobre a 3DFormio',
    children: [
      {
        kind: 'paragraph',
        text: 'A 3DFormio é uma plataforma online para criar arquivos 3D e acessar modelos para confeitaria, makers e pequenos negócios. Também oferece a compra de peças físicas sob demanda, conforme as opções disponíveis no site.',
      },
      {
        kind: 'paragraph',
        text: 'O serviço é operado por VFBS AUTOMACAO E SISTEMAS, CNPJ 62.773.386/0001-21.',
      },
      {
        kind: 'paragraph',
        text: 'Para assuntos jurídicos, privacidade e LGPD, escreva para [e-mail de contato]. Para compras físicas, entrega, cancelamento, devolução ou reembolso, use [e-mail de reembolso] ou os canais oficiais da 3DFormio.',
      },
    ],
  },
  {
    id: 'conta',
    number: '2',
    title: 'Sua conta e suas informações',
    children: [
      {
        kind: 'paragraph',
        text: 'A 3DFormio é destinada exclusivamente a pessoas com 18 anos completos ou mais. Menores de 18 anos não podem acessar ou usar a plataforma, mesmo com autorização de pais ou responsáveis.',
      },
      {
        kind: 'paragraph',
        text: 'Ao acessar ou usar a 3DFormio, você declara ter 18 anos completos ou mais e capacidade legal para contratar.',
      },
      {
        kind: 'paragraph',
        text: 'Forneça dados verdadeiros, atuais e completos. Informações incorretas de cadastro, CPF/CNPJ, telefone ou endereço podem impedir o pagamento ou o envio, atrasar a entrega e exigir correção antes de continuarmos o atendimento.',
      },
      {
        kind: 'paragraph',
        text: 'Use os canais oficiais da 3DFormio para compras, pagamentos e atendimento. Acordos feitos fora deles podem não ser verificáveis pela plataforma.',
      },
    ],
  },
  {
    id: 'planos',
    number: '3',
    title: 'Planos, pagamento e cancelamento',
    children: [
      {
        kind: 'subsection',
        id: 'planos-recursos',
        number: '3.1',
        title: 'O que cada plano oferece',
        children: [
          {
            kind: 'paragraph',
            text: 'Os recursos, preços, limites de criação e downloads de cada plano estão na página de planos. Os direitos sobre suas criações e os modelos da Biblioteca estão explicados no tópico 5.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'planos-pagamento',
        number: '3.2',
        title: 'Pagamento e renovação',
        children: [
          {
            kind: 'paragraph',
            text: 'Pagamentos são processados pelos provedores disponíveis na finalização da compra, como Stripe, Mercado Pago, PagBank, Woovi e ASAAS. Eles podem tratar dados para confirmar identidade, prevenir fraude, processar pagamentos e cumprir suas próprias obrigações legais.',
          },
          {
            kind: 'paragraph',
            text: 'Assinaturas podem ter renovação automática mensal ou anual, conforme a opção contratada. Se o pagamento falhar, os recursos pagos podem ser suspensos até a regularização.',
          },
          {
            kind: 'paragraph',
            text: 'No Pix Automático de assinaturas, nome e CPF/CNPJ podem ser enviados ao provedor de pagamento e ao prestador de emissão fiscal, sem que a 3DFormio guarde esses identificadores fiscais nesse fluxo. Nas compras físicas, esses dados podem ser guardados com o pedido, conforme a Política de Privacidade.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'planos-cancelamento',
        number: '3.3',
        title: 'Como cancelar ou mudar de plano',
        children: [
          {
            kind: 'paragraph',
            text: 'Você pode cancelar a renovação na página de perfil. O cancelamento encerra as próximas cobranças; o acesso continua até o fim do período já pago e depois volta ao Plano Grátis, salvo reembolso ou outra situação prevista nestes termos.',
          },
          {
            kind: 'paragraph',
            text: 'As opções de mudança disponíveis para sua assinatura são apresentadas na página de planos, com valores, recursos e condições antes da confirmação. Para encerrar a renovação, use o cancelamento no perfil; isso não agenda uma troca automática para outro plano pago.',
          },
        ],
      },
    ],
  },
  {
    id: 'compras-fisicas',
    number: '4',
    title: 'Compra de peças físicas e dados de entrega',
    children: [
      {
        kind: 'paragraph',
        text: 'As peças são produzidas sob demanda. Antes de pagar, revise o modelo, a configuração, a cor, a quantidade, o destinatário, o telefone, o CPF/CNPJ, o endereço, o frete e as condições apresentadas na compra.',
      },
      {
        kind: 'paragraph',
        text: 'Podemos solicitar CPF/CNPJ, nome ou razão social, telefone e dados de entrega para processar a compra, calcular frete, entregar, emitir documentos fiscais quando aplicável, atender você e prevenir fraude.',
      },
      {
        kind: 'paragraph',
        text: 'Guardamos as informações da entrega e do pagamento junto ao pedido para realizar a compra e atender eventuais dúvidas, devoluções ou disputas. Salvar um perfil de entrega é opcional e facilita compras futuras. Você pode editar ou apagar esse perfil, mas isso não muda os dados dos pedidos já feitos.',
      },
    ],
  },
  {
    id: 'editor-biblioteca',
    number: '5',
    title: 'Editor 3D e Biblioteca: seus direitos e limites',
    children: [
      {
        kind: 'paragraph',
        text: 'No Editor 3D, você cria um produto a partir de seu próprio conteúdo ou de uma fonte que está autorizado a usar. Na Biblioteca, você acessa conteúdo já disponibilizado pela plataforma. Os direitos dependem dessa origem, e não apenas de onde o arquivo foi exportado.',
      },
      {
        kind: 'paragraph',
        text: 'As regras deste tópico tratam da criação e do uso de conteúdo digital. A compra de peças físicas oferecidas pela 3DFormio segue as condições do tópico 10.',
      },
      {
        kind: 'subsection',
        id: 'editor-direitos',
        number: '5.1',
        title: 'Editor 3D: Você deve ter os direitos sobre o que usa',
        children: [
          {
            kind: 'paragraph',
            text: 'No Editor 3D, ao enviar imagens, desenhos, textos, nomes, marcas, personagens ou outros conteúdos, você declara que possui os direitos e as autorizações necessários para criar, modificar, compartilhar e comercializar o resultado, conforme o uso escolhido.',
          },
          {
            kind: 'paragraph',
            text: 'É sua responsabilidade obter essas autorizações e respeitar direitos autorais, marcas, direitos de imagem e outros direitos de terceiros. Encontrar uma imagem na internet, receber um arquivo de um cliente ou usar inteligência artificial não substitui a autorização do titular.',
          },
          {
            kind: 'paragraph',
            text: 'Essa responsabilidade vale para todos os planos. A plataforma não concede direitos sobre conteúdo de terceiros apenas por transformá-lo em um arquivo 3D.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'editor-uso-comercial',
        number: '5.2',
        title: 'Editor 3D: Arquivos que você cria: uso pessoal e comercial',
        children: [
          {
            kind: 'paragraph',
            text: 'Os planos Pro e Business incluem a licença comercial do Editor: você pode usar, modificar, imprimir e vender peças físicas e arquivos digitais de suas criações próprias, feitas com conteúdo próprio ou devidamente autorizado para esse uso. O Plano Grátis não inclui esse benefício de licença comercial oferecido pela plataforma. Isso não transfere à 3DFormio a titularidade de sua obra nem impede o exercício de direitos que já sejam integralmente seus, independentemente dessa licença.',
          },
          {
            kind: 'paragraph',
            text: 'O fim da assinatura não retira, por si só, a permissão comercial sobre criações próprias legitimamente obtidas no Pro ou Business. Novas criações, recursos e exportações seguem o plano vigente; continuam valendo os direitos de terceiros e o compartilhamento autorizado no plano de origem. Direitos legitimamente concedidos por ofertas e termos anteriores são preservados: esta atualização não os revoga nem presume licença retroativa sobre cada projeto.',
          },
          {
            kind: 'paragraph',
            text: 'Estas regras tratam de criações próprias do Editor. Conteúdo da Biblioteca usado no Editor conserva sua origem e as condições do tópico 5.7.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'editor-business-exclusividade',
        number: '5.3',
        title: 'Editor 3D: Plano Business: exclusividade das suas criações',
        children: [
          {
            kind: 'paragraph',
            text: 'As criações próprias feitas enquanto seu plano Business estiver ativo são exclusivas e não são disponibilizadas na Biblioteca. Você decide como usar seus arquivos, respeitando os direitos e as autorizações descritos no tópico 5.1. A 3DFormio não acompanha nem controla o uso que você faz deles fora da plataforma.',
          },
          {
            kind: 'paragraph',
            text: 'Se você cancelar o Business, as criações próprias feitas nesse plano continuam fora da Biblioteca.',
          },
          {
            kind: 'paragraph',
            text: 'Se você passar do Grátis ou Pro para o Business, apenas as novas criações próprias feitas com o Business ativo terão essa exclusividade. As criações anteriores continuam seguindo as regras do Grátis ou Pro, conforme o plano usado quando foram criadas, e podem ser disponibilizadas na Biblioteca.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'editor-gratis-pro-compartilhado',
        number: '5.4',
        title: 'Editor 3D: Planos Grátis e Pro: direitos compartilhados',
        children: [
          {
            kind: 'paragraph',
            text: 'As criações próprias feitas nos planos Grátis e Pro não são exclusivas. Você mantém os direitos que possui; seu uso comercial segue o tópico 5.2. A autorização de compartilhamento não transfere a propriedade de sua obra à 3DFormio.',
          },
          {
            kind: 'paragraph',
            text: 'Ao aceitar estes termos e criar nesses planos, você concede à VFBS/3DFormio autorização não exclusiva para armazenar, reproduzir, selecionar, adaptar tecnicamente para arquivos e impressão 3D, exibir, publicar e disponibilizar essas contribuições no Acervo e na Biblioteca. Você também autoriza a 3DFormio a conceder aos assinantes Business elegíveis a licença do tópico 5.5 para fabricar, anunciar e vender peças físicas, sem autorizar redistribuição dos arquivos digitais.',
          },
          {
            kind: 'paragraph',
            text: 'A autorização limita-se aos direitos que você efetivamente pode conceder e às finalidades, ao território e à duração do tópico 7. A publicação depende de seleção e revisão; nem toda criação será publicada. Criações próprias feitas no Business permanecem fora do Acervo e da Biblioteca, inclusive após cancelamento.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'biblioteca-venda-fisica',
        number: '5.5',
        title: 'Biblioteca: quando você pode vender peças físicas',
        children: [
          {
            kind: 'paragraph',
            text: 'Somente o plano Business inclui a licença comercial de peças físicas da Biblioteca. Enquanto seu Business estiver ativo e permitir acesso ao modelo, você pode fabricar, anunciar e vender peças físicas dos modelos que autorizem esse uso, respeitando as restrições do item e os direitos de terceiros. Essa licença não autoriza venda ou redistribuição digital dos arquivos. A compra de peças físicas oferecidas pela 3DFormio está disponível conforme a oferta, independentemente dessa licença de fabricante.',
          },
          {
            kind: 'paragraph',
            text: 'O limite de downloads não é um limite de peças físicas: ele controla quantos arquivos você pode baixar.',
          },
          {
            kind: 'paragraph',
            text: 'Essas regras de acesso ativo dizem respeito aos modelos da Biblioteca. Para suas criações próprias, valem os tópicos 5.2 a 5.4.',
          },
          {
            kind: 'paragraph',
            text: 'Se um modelo for retirado ou tiver seu uso restringido por violação de direitos ou risco de segurança, você deve interromper novos usos comerciais desse modelo ao receber o aviso.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'biblioteca-restricoes',
        number: '5.6',
        title: 'Biblioteca: o que você não pode fazer com os arquivos',
        children: [
          {
            kind: 'list',
            items: [
              'Vender, revender, doar, compartilhar, publicar, alugar ou transferir os arquivos digitais da Biblioteca ou do Acervo, inclusive em grupos, drives, lojas, sites ou pacotes de arquivos.',
              'Distribuir versões modificadas desses arquivos ou repassar a licença a outra pessoa. Alterar tamanho, cor ou formato não transforma um modelo da Biblioteca em uma criação própria com direito de redistribuição.',
              'Copiar o catálogo, imagens de apresentação ou informações dos modelos em massa, automatizar downloads para contornar limites, burlar controles de acesso ou usar o conteúdo para treinar inteligência artificial.',
              'Usar modelos da Biblioteca para reproduzir o desenho em escala industrial por moldagem, fundição ou outros processos de fabricação em massa.',
              'Usar arquivos, imagens ou informações da Biblioteca para montar um catálogo concorrente, uma base de dados de redistribuição ou outro serviço de geração de modelos.',
            ],
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'biblioteca-editor',
        number: '5.7',
        title: 'Biblioteca usada no Editor 3D',
        children: [
          {
            kind: 'paragraph',
            text: 'Usar uma imagem da Biblioteca no Editor 3D permite adaptar o produto às opções disponíveis, mas não torna o desenho original seu nem exclusivo. A assinatura Business protege suas criações próprias; ela não transforma uma fonte compartilhada da Biblioteca em conteúdo exclusivo.',
          },
          {
            kind: 'paragraph',
            text: 'Quando o arquivo gerado reproduzir conteúdo da Biblioteca, a venda de peças físicas continua sujeita à licença da Biblioteca, ao Business elegível ativo e às restrições do item. Gerar um novo arquivo, mudar medidas, cores ou configurações não autoriza vender, compartilhar ou redistribuir o conteúdo digital da Biblioteca.',
          },
          {
            kind: 'paragraph',
            text: 'Se você combinar fontes diferentes, precisa ter as autorizações necessárias sobre cada uma. A exclusividade e a venda de arquivos de uma criação própria não concedem direitos sobre a parte pertencente à Biblioteca ou a terceiros.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'editor-seguranca',
        number: '5.8',
        title: 'Editor 3D e Biblioteca: segurança e direitos de terceiros',
        children: [
          {
            kind: 'paragraph',
            text: 'Você é responsável pela fabricação e comercialização das peças que vende, inclusive materiais, higiene, acabamento, avisos, tributos e segurança. Um arquivo 3D não é uma certificação de que a peça é adequada para contato com alimentos ou outros usos que exijam cuidados específicos.',
          },
          {
            kind: 'paragraph',
            text: 'A licença da Biblioteca não é autorização para usar marcas, personagens, imagens de pessoas, desenhos protegidos ou patentes de terceiros. Também não permite apresentar sua venda como oficialmente aprovada pela 3DFormio. A revisão de um modelo não garante a ausência de direitos de terceiros.',
          },
          {
            kind: 'paragraph',
            text: 'Essas responsabilidades se referem à fabricação e à comercialização realizadas por você. Elas não afastam as responsabilidades da 3DFormio pelas peças que ela própria fornece.',
          },
        ],
      },
    ],
  },
  {
    id: 'usos-proibidos',
    number: '6',
    title: 'Usos que não são permitidos',
    children: [
      {
        kind: 'list',
        items: [
          'Violar a lei, direitos autorais, marcas, direitos de imagem ou outros direitos de terceiros.',
          'Automatizar o uso em massa sem autorização, contornar os limites do plano ou os controles de segurança e download.',
          'Usar modelos gerados pela plataforma ou conteúdo da Biblioteca para treinar sistemas de inteligência artificial de terceiros.',
        ],
      },
    ],
  },
  {
    id: 'acervo-biblioteca',
    number: '7',
    title: 'Criações Grátis e Pro no Acervo e na Biblioteca',
    children: [
      {
        kind: 'paragraph',
        text: 'A autorização do tópico 5.4 abrange as contribuições próprias Grátis e Pro elegíveis, nos formatos digitais e processos de impressão 3D descritos nestes termos, para operação do Acervo e da Biblioteca e licenciamento de peças físicas a assinantes Business elegíveis. Ela vale no Brasil e no exterior, somente onde você disponha dos direitos necessários. Não abrange suas criações próprias Business, marcas, imagem de pessoas ou outros direitos de terceiros que você não possa autorizar.',
      },
      {
        kind: 'paragraph',
        text: 'Para cada contribuição elegível, a autorização inicia quando ela é criada sob estes termos aceitos e permanece enquanto disponibilizada para essas finalidades, sujeita à retirada e aos limites legais. Você pode solicitar a retirada pelo contato de direitos do tópico 12. A continuidade ou interrupção de usos já legitimamente autorizados será examinada conforme a licença aplicável, os direitos envolvidos e a lei; não se cria licença perpétua ou direito de explorar conteúdo infrator. Registros necessários à apuração e à defesa de direitos podem ser preservados conforme a Política de Privacidade.',
      },
      {
        kind: 'paragraph',
        text: 'Ao aceitar esta versão, você também concede, a partir desse aceite, a autorização aqui descrita para suas contribuições anteriores elegíveis Grátis e Pro que permaneçam no Acervo ou na Biblioteca, somente quanto aos direitos que pode conceder. Isso não declara que você aceitou uma versão antiga nem prova autorização passada ou direitos de terceiros. Autorizações e compromissos anteriores válidos são preservados. Quem não aceitou esta versão não é considerado aceitante por login, inatividade ou registro de uso.',
      },
      {
        kind: 'paragraph',
        text: 'Os direitos morais do autor, inclusive autoria e integridade, são preservados. As adaptações técnicas autorizadas não representam renúncia a esses direitos. Pedidos de identificação, correção de atribuição ou proteção da integridade podem ser encaminhados pelo contato de direitos do tópico 12 e serão tratados conforme os direitos aplicáveis.',
      },
      {
        kind: 'paragraph',
        text: 'Podemos recusar, restringir ou remover conteúdo diante de indícios consistentes de violação, preservando evidências e analisando as informações dos envolvidos conforme o tópico 8. Quando necessário em um caso concreto, podemos pedir comprovação específica; não há exigência geral de documentos por criação. Seleção e revisão humana ou assistida por IA não certificam originalidade, titularidade ou ausência de restrições. Essas medidas não afastam responsabilidades próprias da 3DFormio nem os direitos legais dos envolvidos.',
      },
    ],
  },
  {
    id: 'denuncias',
    number: '8',
    title: 'Denúncias, proteção de direitos e uso de má-fé',
    children: [
      {
        kind: 'paragraph',
        text: 'Se um conteúdo violar seus direitos, denuncie pelo atendimento da Biblioteca/Acervo ou por [e-mail de contato]. Identifique o item, o direito afetado e as informações que sustentam o pedido.',
      },
      {
        kind: 'paragraph',
        text: 'Podemos ocultar ou remover o conteúdo e suspender downloads ou usos autorizados enquanto analisamos a denúncia. Quando cabível, ouviremos os envolvidos e pediremos documentos adicionais.',
      },
      {
        kind: 'paragraph',
        text: 'Você pode denunciar uma violação de direitos e solicitar a análise do conteúdo. Esse direito é preservado mesmo quando a análise não confirma a violação. Denúncias deliberadamente falsas e tentativas de fraude podem ser investigadas com base nas informações e provas disponíveis.',
      },
      {
        kind: 'paragraph',
        text: 'Podemos preservar registros necessários para analisar denúncias, resolver disputas, cumprir ordens judiciais e defender direitos, com acesso restrito e conforme a Política de Privacidade. Isso não afasta as responsabilidades legais da plataforma.',
      },
    ],
  },
  {
    id: 'inteligencia-artificial',
    number: '9',
    title: 'Inteligência artificial e funcionamento do serviço',
    children: [
      {
        kind: 'paragraph',
        text: 'Ao usar o serviço, você autoriza a 3DFormio a armazenar e processar os conteúdos e as instruções que fornece para gerar arquivos, apresentar resultados, corrigir falhas, prestar suporte e proteger o serviço. Esse processamento não significa publicação: apenas criações Grátis e Pro podem alimentar o Acervo e a Biblioteca, conforme os tópicos 5.4 e 7.',
      },
      {
        kind: 'paragraph',
        text: 'Resultados feitos com inteligência artificial ou transformações automáticas podem precisar de ajustes. Gerar um arquivo não substitui as autorizações necessárias para usar conteúdo de terceiros, descritas no tópico 5.1. Quando a fonte for da Biblioteca, continuam valendo as regras do tópico 5.7.',
      },
      {
        kind: 'paragraph',
        text: 'A assistência por IA não é certificação jurídica, de originalidade, de registrabilidade ou de autorização de terceiros. Obras pouco conhecidas também podem ser protegidas; a transformação em 3D e a publicação não eliminam esses direitos.',
      },
    ],
  },
  {
    id: 'reembolso',
    number: '10',
    title: 'Cancelamento, devolução e reembolso',
    children: [
      {
        kind: 'subsection',
        id: 'reembolso-assinaturas',
        number: '10.1',
        title: 'Assinaturas e serviços digitais',
        children: [
          {
            kind: 'paragraph',
            text: 'Nas relações de consumo brasileiras, o direito de arrependimento permite solicitar reembolso integral em até 7 dias corridos da contratação, conforme o Código de Defesa do Consumidor. O exercício desse direito não depende de uma renúncia por ter usado o serviço.',
          },
          {
            kind: 'paragraph',
            text: 'Cobranças duplicadas ou indevidas e falhas persistentes que impeçam o uso devem ser comunicadas ao suporte. Falhas técnicas reportadas que impeçam o uso por mais de 72 horas também podem fundamentar um pedido de reembolso; esse prazo não limita direitos previstos em lei.',
          },
          {
            kind: 'paragraph',
            text: 'Fora do prazo de arrependimento, deixar de usar o plano ou esquecer de cancelar não gera, por si só, reembolso automático. Pedidos são avaliados conforme os fatos e os direitos aplicáveis, sem excluir soluções devidas por falha do serviço.',
          },
          {
            kind: 'paragraph',
            text: 'Para clientes fora do Brasil, a análise considera a legislação aplicável, a oferta apresentada na compra, a moeda e o meio de pagamento.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'reembolso-revisao-producao',
        number: '10.2',
        title: 'Compra física: revisão e produção',
        children: [
          {
            kind: 'paragraph',
            text: 'As peças são impressas em 3D sob demanda, conforme o modelo, as medidas, a cor e a quantidade escolhidos. Antes de pagar, revise os itens, os valores, o frete, os prazos e os dados de entrega. O pagamento confirmado não significa, por si só, que a fabricação já começou.',
          },
          {
            kind: 'paragraph',
            text: 'O pedido pode passar por revisão manual de pagamento, configuração, disponibilidade e viabilidade de produção. Se precisarmos de aprovação ou correção, entraremos em contato pelo pedido. Quando a execução não for possível, informaremos o motivo e a solução aplicável, inclusive reembolso quando devido.',
          },
          {
            kind: 'paragraph',
            text: 'O prazo de produção é apresentado em dias úteis. No acompanhamento do pedido, essa etapa usa a aprovação como referência e, na ausência dela, a confirmação do pagamento. O início efetivo da fabricação é registrado no pedido; não se confunde com a simples criação do carrinho ou pagamento.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'reembolso-envio',
        number: '10.3',
        title: 'Compra física: envio, prazos e entrega',
        children: [
          {
            kind: 'paragraph',
            text: 'A previsão de entrega combina o tempo de produção com o tempo de transporte. O prazo de transporte é associado à postagem e ao serviço contratado. Confira os prazos de cada etapa e a previsão final exibidos na compra e no acompanhamento do pedido.',
          },
          {
            kind: 'paragraph',
            text: 'Feriados, informações incorretas, correções que dependam do cliente e ocorrências de transporte podem afetar o andamento. Se houver alteração relevante, informaremos a situação e os próximos passos. A previsão inicialmente apresentada permanece como referência da oferta; uma atualização não elimina seus direitos por atraso ou descumprimento.',
          },
          {
            kind: 'paragraph',
            text: 'Quando houver código ou link de rastreio, ele será informado no pedido. Se o pacote ficar parado, for extraviado, não chegar ou for devolvido ao remetente, fale pelo atendimento do pedido. A 3DFormio analisará o ocorrido junto ao transportador e orientará a solução, sem transferir ao cliente a responsabilidade por resolver sozinho um problema da entrega contratada.',
          },
          {
            kind: 'paragraph',
            text: 'Se o endereço estiver incorreto ou incompleto, avise imediatamente. A possibilidade de correção depende da etapa do pedido. Se houver necessidade de novo envio, suas condições e eventuais custos legalmente cabíveis serão informados antes, sem cobrança surpresa.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'reembolso-cancelamento',
        number: '10.4',
        title: 'Compra física: cancelamento e arrependimento',
        children: [
          {
            kind: 'paragraph',
            text: 'Você pode solicitar cancelamento pelo atendimento do pedido ou por [e-mail de reembolso]. Quanto antes nos avisar, maior a possibilidade de interromper uma produção ou postagem ainda evitável.',
          },
          {
            kind: 'paragraph',
            text: 'Nas compras físicas online sujeitas ao CDC, você pode exercer o direito de arrependimento em até 7 dias corridos após o recebimento do produto, sem precisar justificar a desistência. Entre em contato para receber as orientações de devolução e reembolso.',
          },
          {
            kind: 'paragraph',
            text: 'Ser personalizado ou já estar em produção não elimina automaticamente esse direito nem as soluções devidas por defeito, erro, dano, atraso ou entrega diferente da oferta. Fora das hipóteses legais, um cancelamento ou troca por mera preferência depois do início da produção depende de análise e acordo; não há promessa de cancelamento comercial livre nesse caso.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'reembolso-problema',
        number: '10.5',
        title: 'Compra física: problema, documentos e comprovação',
        children: [
          {
            kind: 'paragraph',
            text: 'Informe o número do pedido, descreva o problema e diga quando ele foi percebido. Conforme o caso, podemos solicitar fotos ou vídeos da peça, embalagem, etiqueta, itens recebidos e comprovantes de entrega ou transporte.',
          },
          {
            kind: 'paragraph',
            text: 'Se pedirmos o retorno do produto, guarde o comprovante de postagem e as informações de rastreio. As solicitações de prova devem ser necessárias e proporcionais ao problema; a impossibilidade de apresentar uma prova específica não impede, por si só, a análise de um direito legítimo.',
          },
          {
            kind: 'paragraph',
            text: 'Não exigimos vídeo de desembalagem como condição geral para atendimento. Também consideramos os registros do pedido, da produção, da postagem e do transportador para apurar defeito, dano, item errado, entrega incompleta, atraso ou não recebimento.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'reembolso-devolucao',
        number: '10.6',
        title: 'Compra física: devolução e condição do produto',
        children: [
          {
            kind: 'paragraph',
            text: 'Antes de enviar uma devolução, peça as instruções pelo atendimento do pedido. Informaremos o endereço de retorno e a forma de postagem aplicáveis ao caso. Preserve a peça e, quando disponíveis e aplicáveis, a embalagem, os acessórios e os documentos recebidos; embale o produto adequadamente para o transporte.',
          },
          {
            kind: 'paragraph',
            text: 'A ausência da embalagem original não elimina automaticamente direitos por defeito ou outros direitos legais. Alteração da peça, dano por mau uso, envio de produto diferente ou uso além da inspeção razoável podem ser considerados na análise, sem uma recusa automática de direitos previstos em lei.',
          },
          {
            kind: 'paragraph',
            text: 'Nos retornos por arrependimento legal, defeito ou erro do fornecimento, a 3DFormio orientará e assumirá os custos de retorno que lhe sejam legalmente devidos. Em soluções comerciais voluntárias, outras condições só serão adotadas se informadas e combinadas antes. A devolução é coordenada pelo atendimento, conforme o caso.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'reembolso-troca',
        number: '10.7',
        title: 'Compra física: troca, reembolso e proteção contra fraude',
        children: [
          {
            kind: 'paragraph',
            text: 'A solução pode envolver correção, substituição, reimpressão, novo envio, troca ou reembolso, conforme o problema e a legislação aplicável. Aprovar um pedido de reembolso não significa que o valor já apareceu na conta ou fatura.',
          },
          {
            kind: 'paragraph',
            text: 'Quando o arrependimento legal exigir estorno, comunicaremos a solicitação ao responsável pelo pagamento de imediato. A disponibilização do valor depende do meio de pagamento e da instituição responsável; informaremos o andamento. Só comunicamos o processamento como concluído após sua confirmação.',
          },
          {
            kind: 'paragraph',
            text: 'Provas falsificadas, fotos manipuladas, falsa alegação de não recebimento ou defeito, devolução de produto diferente e tentativa indevida de manter produto e reembolso podem ser investigadas. Quando permitido por lei e sustentado por provas, podemos recusar um pedido indevido, restringir operações, preservar registros e defender nossos direitos.',
          },
          {
            kind: 'paragraph',
            text: 'Você tem direito a atendimento, a reclamar de problemas, a solicitar cancelamento, devolução ou reembolso nas situações previstas em lei e a procurar órgãos de defesa do consumidor. Esses direitos permanecem mesmo que sua reclamação não seja confirmada na análise. Qualquer medida por fraude depende de provas e deve respeitar seus direitos legais.',
          },
        ],
      },
      {
        kind: 'subsection',
        id: 'reembolso-atendimento',
        number: '10.8',
        title: 'Compra física: confirmação e resposta do atendimento',
        children: [
          {
            kind: 'paragraph',
            text: 'As solicitações feitas pelo pedido geram confirmação ou protocolo no próprio canal. Para demandas enviadas por e-mail, a confirmação de recebimento é encaminhada pelo mesmo meio. Essa confirmação informa que recebemos sua solicitação; o resultado da análise será comunicado separadamente.',
          },
          {
            kind: 'paragraph',
            text: 'As demandas de consumo recebem manifestação em até 5 dias corridos. Quando a solução depender de apuração, devolução ou confirmação do pagamento, a resposta informará o andamento e os próximos passos, preservados os demais prazos e direitos legais.',
          },
        ],
      },
    ],
  },
  {
    id: 'aceite',
    number: '11',
    title: 'Aceite e mudanças nos termos',
    children: [
      {
        kind: 'paragraph',
        text: 'O uso do serviço depende da aceitação destes Termos e da ciência da Política de Privacidade. Podemos guardar qual versão foi aceita, quando e por quem, para comprovar as condições aplicáveis à conta ou à compra.',
      },
      {
        kind: 'paragraph',
        text: 'Alterações relevantes serão comunicadas por e-mail ou aviso na plataforma. Novas versões não alteram automaticamente compras passadas nem autorizações já concedidas.',
      },
      {
        kind: 'paragraph',
        text: 'Para relações brasileiras, prevalece a versão em português do Brasil. As versões em inglês e espanhol facilitam a leitura e não ampliam os direitos descritos na versão brasileira, respeitada a legislação aplicável.',
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
        text: 'Dúvidas sobre termos, conteúdo e direitos: [e-mail de contato]. Compras físicas, entrega, cancelamento, devolução e reembolso: [e-mail de reembolso] ou atendimento do pedido.',
      },
    ],
  },
]
