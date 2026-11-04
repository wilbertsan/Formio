import { Text } from '@aws-amplify/ui-react'
import { Link } from 'react-router-dom'
import { LegalDocumentPage } from './components/LegalDocumentPage'
import { termsSections, termsUpdatedAt } from './config/terms'

export function TermsPage() {
  return (
    <LegalDocumentPage
      title="Termos de Uso"
      description="Condições para usar a 3DFormio, contratar planos e comprar peças físicas."
      updatedAt={termsUpdatedAt}
      tocLabel="Índice dos termos"
      sections={termsSections}
      closing={
        <Text as="p" fontSize="small" color="font.tertiary">
          Ao utilizar a 3DFormio, você concorda com estes termos e com a{' '}
          <Link
            to="/privacidade"
            className="text-brand-600 underline underline-offset-4 hover:text-brand-700"
          >
            Política de Privacidade
          </Link>
          .
        </Text>
      }
    />
  )
}
