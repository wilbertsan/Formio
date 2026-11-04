import {
  termsSections,
  termsUpdatedAt,
  type LegalNode,
  type LegalSection,
} from '@/features/legal/config/terms'

function collectNodes(nodes: LegalNode[]): LegalNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'subsection' ? [node, ...collectNodes(node.children)] : [node],
  )
}

function collectText(sections: LegalSection[]): string {
  return sections
    .flatMap((section) => [
      section.title,
      ...collectNodes(section.children).flatMap((node) => {
        if (node.kind === 'paragraph') return [node.text]
        if (node.kind === 'list') return node.items
        return [node.number, node.title]
      }),
    ])
    .join('\n')
}

describe('termsSections', () => {
  it('contém os 12 tópicos com numeração sequencial e ids únicos', () => {
    expect(termsSections).toHaveLength(12)

    const ids = termsSections.map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)

    termsSections.forEach((section, index) => {
      expect(section.number).toBe(String(index + 1))
      expect(section.title.trim()).not.toBe('')
      expect(section.children.length).toBeGreaterThan(0)
    })
  })

  it('destaca cancelamento, devolução e reembolso no tópico 10', () => {
    const refundSection = termsSections.find((section) => section.id === 'reembolso')

    expect(refundSection).toBeDefined()
    expect(refundSection?.number).toBe('10')
    expect(refundSection?.title).toMatch(/cancelamento, devolução e reembolso/i)

    const text = collectText(refundSection ? [refundSection] : [])
    expect(text).toContain('7 dias corridos')
    expect(text).toContain('reembolso')
    expect(text).toContain('10.8')
  })

  it('está adaptado à marca e aos planos do 3DFormio', () => {
    const text = collectText(termsSections)

    expect(text).toContain('3DFormio')
    expect(text).toContain('VFBS AUTOMACAO E SISTEMAS')
    expect(text).toContain('62.773.386/0001-21')
    expect(text).toContain('Business')
    expect(text).toContain('[e-mail de contato]')
    expect(text).toContain('[e-mail de reembolso]')
  })

  it('não mantém referências da Confeitaria3D nem aviso de minuta', () => {
    const text = collectText(termsSections)

    expect(text).not.toContain('Confeitaria3D')
    expect(text).not.toContain('MINUTA')
    expect(text).not.toContain('Livre')
    expect(text).not.toContain('Arte')
    expect(text).not.toMatch(/\bPRO\b/)
  })

  it('não possui parágrafos, itens de lista ou subseções vazios', () => {
    for (const section of termsSections) {
      for (const node of collectNodes(section.children)) {
        if (node.kind === 'paragraph') {
          expect(node.text.trim()).not.toBe('')
        }

        if (node.kind === 'list') {
          expect(node.items.length).toBeGreaterThan(0)
          node.items.forEach((item) => expect(item.trim()).not.toBe(''))
        }

        if (node.kind === 'subsection') {
          expect(node.id.trim()).not.toBe('')
          expect(node.number.trim()).not.toBe('')
          expect(node.title.trim()).not.toBe('')
          expect(node.children.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('expõe a data de atualização', () => {
    expect(termsUpdatedAt.trim()).not.toBe('')
  })
})
