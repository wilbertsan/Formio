import { Flex, Heading, Text, View } from '@aws-amplify/ui-react'
import { Link } from 'react-router-dom'
import { HeroVisual } from './HeroVisual'

export function Hero() {
  return (
    <View as="section" padding={{ base: 'xxl', large: 'xxxl' }}>
      <Flex
        direction={{ base: 'column', large: 'row' }}
        alignItems="center"
        justifyContent="space-between"
        gap="xxl"
        maxWidth="1120px"
        margin="0 auto"
      >
        <Flex direction="column" gap="large" maxWidth="560px">
          <Heading level={1} fontSize={{ base: 'xxxl', large: 'xxxxl' }} color="font.primary">
            Modelos 3D personalizados em segundos
          </Heading>
          <Text fontSize="large" color="font.tertiary">
            Ajuste parâmetros, visualize e baixe STL prontos para impressão — sem instalar nada.
          </Text>
          <Flex direction="row" gap="medium" wrap="wrap">
            <Link to="/cadastro" className="btn-primary">
              Começar grátis
            </Link>
            <a href="#precos" className="btn-secondary">
              Ver preços
            </a>
          </Flex>
          <Link
            to="/studio"
            className="text-sm font-medium text-teal-600 no-underline underline-offset-4 hover:underline"
          >
            Abrir o Studio →
          </Link>
        </Flex>
        <HeroVisual />
      </Flex>
    </View>
  )
}
