import { Text } from '@aws-amplify/ui-react'
import { Link } from 'react-router-dom'
import { LegalDocumentPage } from './components/LegalDocumentPage'
import { privacySections, privacyUpdatedAt } from './config/privacy'

export function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Política de Privacidade"
      description="Como a 3DFormio trata seus dados pessoais, com quem compartilha e como você pode exercer seus direitos."
      updatedAt={privacyUpdatedAt}
      tocLabel="Índice da política de privacidade"
      sections={privacySections}
      closing={
        <Text as="p" fontSize="small" color="font.tertiary">
          Esta política complementa os{' '}
          <Link
            to="/termos"
            className="text-brand-600 underline underline-offset-4 hover:text-brand-700"
          >
            Termos de Uso
          </Link>
          . Ao utilizar a 3DFormio, você declara ciência desta Política de Privacidade.
        </Text>
      }
    />
  )
}
