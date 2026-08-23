export interface FaqItem {
  question: string
  answer: string
}

export const faqItems: FaqItem[] = [
  {
    question: 'Preciso instalar algo para usar o 3DFormio?',
    answer:
      'Não. Tudo funciona no navegador: você ajusta os parâmetros, visualiza o resultado e baixa o arquivo. Sem instalação e sem configuração.',
  },
  {
    question: 'Quais formatos de download estão disponíveis?',
    answer:
      'Hoje todos os modelos são gerados em STL, o formato mais compatível com impressoras 3D e fatiadores como Cura, PrusaSlicer e Bambu Studio.',
  },
  {
    question: 'O que são créditos?',
    answer:
      'Créditos são a moeda do 3DFormio. Cada geração de modelo consome créditos, que são renovados mensalmente conforme o seu plano.',
  },
  {
    question: 'Os modelos estão prontos para impressão?',
    answer:
      'Sim. Todo modelo gerado é um sólido válido e manifold, pronto para fatiar e imprimir, com parâmetros como tolerâncias e espessuras validados.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer:
      'Sim. O cancelamento é feito pelo painel da sua conta. Você mantém o acesso até o fim do período já pago e não perde seu histórico de modelos.',
  },
  {
    question: 'Posso usar os modelos comercialmente?',
    answer:
      'No plano Business sim, sem restrições. Nos planos Grátis e Pro o uso é permitido para projetos pessoais e de portfólio.',
  },
]