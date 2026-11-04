import { Heading, Text, View } from '@aws-amplify/ui-react'
import type { LegalNode, LegalSection } from '../config/terms'

const paragraphClassName = 'text-sm leading-relaxed text-neutral-700 sm:text-base'

function LegalNodes({ nodes }: { nodes: LegalNode[] }) {
  return (
    <View className="flex flex-col gap-4">
      {nodes.map((node, index) => {
        if (node.kind === 'paragraph') {
          return (
            <Text as="p" key={`paragraph-${index}`} className={paragraphClassName}>
              {node.text}
            </Text>
          )
        }

        if (node.kind === 'list') {
          return (
            <ul
              key={`list-${index}`}
              className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-neutral-700 sm:text-base"
            >
              {node.items.map((item, itemIndex) => (
                <li key={`item-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          )
        }

        return (
          <section
            key={node.id}
            id={node.id}
            aria-labelledby={`${node.id}-title`}
            className="scroll-mt-24"
          >
            <Heading
              level={3}
              id={`${node.id}-title`}
              className="mb-3 text-lg font-semibold text-neutral-900"
            >
              {node.number} {node.title}
            </Heading>
            <LegalNodes nodes={node.children} />
          </section>
        )
      })}
    </View>
  )
}

export function LegalArticle({ section }: { section: LegalSection }) {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-title`}
      className="scroll-mt-24 border-t border-neutral-200 pt-8"
    >
      <Heading
        level={2}
        id={`${section.id}-title`}
        className="mb-4 text-xl font-bold text-neutral-900 sm:text-2xl"
      >
        {section.number}. {section.title}
      </Heading>
      <LegalNodes nodes={section.children} />
    </section>
  )
}
