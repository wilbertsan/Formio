import type { ReactNode } from 'react'
import { Flex, Heading, Text, View } from '@aws-amplify/ui-react'
import { Footer } from '@/features/landing/components/Footer'
import { Navbar } from '@/features/landing/components/Navbar'
import type { LegalSection } from '../config/terms'
import { LegalArticle } from './LegalArticle'
import { LegalToc } from './LegalToc'

interface LegalDocumentPageProps {
  title: string
  description: string
  updatedAt: string
  tocLabel: string
  sections: LegalSection[]
  closing?: ReactNode
}

export function LegalDocumentPage({
  title,
  description,
  updatedAt,
  tocLabel,
  sections,
  closing,
}: LegalDocumentPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <View padding={{ base: 'xl', large: 'xxxl' }}>
          <Flex direction="column" gap="xxl" maxWidth="1120px" margin="0 auto">
            <Flex direction="column" gap="medium" maxWidth="760px">
              <Heading
                level={1}
                fontSize={{ base: 'xxxl', large: 'xxxxl' }}
                color="font.primary"
              >
                {title}
              </Heading>
              <Text fontSize="large" color="font.tertiary">
                {description}
              </Text>
              <Text fontSize="small" color="font.tertiary">
                Última atualização: {updatedAt}
              </Text>
            </Flex>

            <Flex
              direction={{ base: 'column', large: 'row' }}
              gap="xxl"
              alignItems="flex-start"
            >
              <LegalToc sections={sections} label={tocLabel} />
              <View as="article" className="flex min-w-0 flex-1 flex-col gap-10">
                {sections.map((section) => (
                  <LegalArticle key={section.id} section={section} />
                ))}
                {closing ? (
                  <View className="border-t border-neutral-200 pt-6">{closing}</View>
                ) : null}
              </View>
            </Flex>
          </Flex>
        </View>
      </main>
      <Footer />
    </div>
  )
}
