export interface Plan {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlighted: boolean
  ctaLabel: string
  ctaHref: string
}

export const plans: Plan[] = [
  {
    id: 'gratis',
    name: 'Grátis',
    price: 'R$ 0',
    period: 'para sempre',
    description: 'Para conhecer a plataforma.',
    features: [
      'Acesso ao gerador básico',
      '3 gerações por mês',
      'Download em STL',
      'Histórico de modelos',
    ],
    highlighted: false,
    ctaLabel: 'Começar grátis',
    ctaHref: '/cadastro',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 29',
    period: 'por mês',
    description: 'Para quem imprime com frequência.',
    features: [
      'Gerações ilimitadas',
      '100 créditos por mês',
      'Todos os modelos premium',
      'Suporte por e-mail',
    ],
    highlighted: true,
    ctaLabel: 'Assinar o Pro',
    ctaHref: '/cadastro',
  },
  {
    id: 'business',
    name: 'Business',
    price: 'R$ 89',
    period: 'por mês',
    description: 'Para equipes e negócios.',
    features: [
      'Tudo do Pro',
      '500 créditos por mês',
      'Uso comercial dos modelos',
      'Suporte prioritário',
    ],
    highlighted: false,
    ctaLabel: 'Assinar o Business',
    ctaHref: '/cadastro',
  },
]
