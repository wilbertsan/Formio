import { Flex, Text, View } from '@aws-amplify/ui-react'
import { Link } from 'react-router-dom'

const footerLinkClassName =
  'text-sm text-neutral-600 no-underline transition-colors hover:text-neutral-900'

export function Footer() {
  return (
    <View as="footer" padding="xxl" backgroundColor="background.secondary">
      <Flex
        direction={{ base: 'column', medium: 'row' }}
        justifyContent="space-between"
        gap="large"
        maxWidth="1120px"
        margin="0 auto"
      >
        <Flex direction="column" gap="xs">
          <span className="text-lg font-bold text-neutral-900">3DFormio</span>
          <Text color="font.tertiary" fontSize="small">
            Modelos 3D personalizados para impressão.
          </Text>
        </Flex>
        <Flex direction="row" gap="xl">
          <a href="#precos" className={footerLinkClassName}>
            Preços
          </a>
          <a href="#faq" className={footerLinkClassName}>
            FAQ
          </a>
          <Link to="/termos" className={footerLinkClassName}>
            Termos
          </Link>
          <Link to="/privacidade" className={footerLinkClassName}>
            Privacidade
          </Link>
        </Flex>
      </Flex>
      <Text fontSize="small" color="font.tertiary" textAlign="center" marginTop="xxl">
        © {new Date().getFullYear()} 3DFormio. Todos os direitos reservados.
      </Text>
    </View>
  )
}
