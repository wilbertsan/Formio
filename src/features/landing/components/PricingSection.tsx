import { Badge, Card, Flex, Heading, Text, View } from '@aws-amplify/ui-react'
import { Link } from 'react-router-dom'
import { plans } from '../config/plans'

export function PricingSection() {
  return (
    <View
      as="section"
      id="precos"
      padding={{ base: 'xxl', large: 'xxxl' }}
      backgroundColor="background.secondary"
    >
      <Flex
        direction="column"
        alignItems="center"
        gap="xxl"
        maxWidth="1120px"
        margin="0 auto"
      >
        <Flex direction="column" alignItems="center" gap="medium">
          <Heading level={2} fontSize="xxl" color="font.primary">
            Planos para cada etapa
          </Heading>
          <Text color="font.tertiary">Comece grátis e evolua conforme suas impressões.</Text>
        </Flex>
        <Flex
          direction={{ base: 'column', large: 'row' }}
          gap="large"
          justifyContent="center"
          alignItems={{ base: 'center', large: 'stretch' }}
        >
          {plans.map((plan) => (
            <Card
              key={plan.id}
              variation={plan.highlighted ? 'elevated' : 'outlined'}
              className={
                plan.highlighted
                  ? 'w-full max-w-sm border-2 border-brand-600'
                  : 'w-full max-w-sm'
              }
            >
              <Flex direction="column" gap="medium" minHeight="100%">
                {plan.highlighted ? <Badge variation="success">Mais popular</Badge> : null}
                <Heading level={3} color="font.primary">
                  {plan.name}
                </Heading>
                <Flex direction="row" alignItems="baseline" gap="xs">
                  <Text fontSize="xxl" fontWeight="bold" color="font.primary">
                    {plan.price}
                  </Text>
                  <Text color="font.tertiary">{plan.period}</Text>
                </Flex>
                <Text color="font.tertiary">{plan.description}</Text>
                <ul className="flex flex-col gap-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-neutral-700"
                    >
                      <span aria-hidden="true" className="mt-0.5 text-brand-600">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.ctaHref}
                  className={plan.highlighted ? 'btn-primary mt-auto' : 'btn-secondary mt-auto'}
                >
                  {plan.ctaLabel}
                </Link>
              </Flex>
            </Card>
          ))}
        </Flex>
      </Flex>
    </View>
  )
}
