import { View } from '@aws-amplify/ui-react'
import type { LegalSection } from '../config/terms'

interface LegalTocProps {
  sections: LegalSection[]
  label: string
}

export function LegalToc({ sections, label }: LegalTocProps) {
  return (
    <View
      as="nav"
      aria-label={label}
      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-5 lg:sticky lg:top-24 lg:w-64 lg:shrink-0"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Nesta página
      </p>
      <ol className="flex flex-col gap-2">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="text-sm text-neutral-600 no-underline transition-colors hover:text-brand-600"
            >
              {section.number}. {section.title}
            </a>
          </li>
        ))}
      </ol>
    </View>
  )
}
