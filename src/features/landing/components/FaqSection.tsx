import { Accordion, Flex, Heading, View } from '@aws-amplify/ui-react'
import { faqItems } from '../config/faq'

export function FaqSection() {
  return (
    <View as="section" id="faq" padding={{ base: 'xxl', large: 'xxxl' }}>
      <Flex direction="column" alignItems="center" gap="xxl" maxWidth="760px" margin="0 auto">
        <Heading level={2} fontSize="xxl" color="font.primary">
          Perguntas frequentes
        </Heading>
        <Accordion.Container allowMultiple width="100%">
          {faqItems.map((item) => (
            <Accordion.Item key={item.question} value={item.question}>
              <Accordion.Trigger>
                {item.question}
                <Accordion.Icon />
              </Accordion.Trigger>
              <Accordion.Content>{item.answer}</Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Container>
      </Flex>
    </View>
  )
}
