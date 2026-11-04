import {
  privacySections,
  privacyUpdatedAt,
  type LegalNode,
  type LegalSection,
} from '@/features/legal/config/privacy'

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

describe('privacySections', () => {
  it('contém os 12 tópicos com numeração sequencial e ids únicos', () => {
    expect(privacySections).toHaveLength(12)

    const ids = privacySections.map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)

    privacySections.forEach((section, index) => {
      expect(section.number).toBe(String(index + 1))
      expect(section.title.trim()).not.toBe('')
      expect(section.children.length).toBeGreaterThan(0)
    })
  })

  it('cobre cookies, retenção e direitos dos titulares', () => {
    const sectionsById = new Map(privacySections.map((section) => [section.id, section]))
    const text = collectText(privacySections)

    expect(sectionsById.get('cookies')?.title).toMatch(/cookies e publicidade/i)
    expect(sectionsById.get('retencao')?.title).toMatch(/por quanto tempo/i)
    expect(sectionsById.get('direitos')?.title).toMatch(/seus direitos/i)
    expect(text).toContain('LGPD')
    expect(text).toContain('15 dias')
    expect(text).toContain('OpenRouter')
  })

  it('está adaptado à marca, aos planos e aos contatos do 3DFormio', () => {
    const text = collectText(privacySections)

    expect(text).toContain('3DFormio')
    expect(text).toContain('VFBS AUTOMACAO E SISTEMAS')
    expect(text).toContain('62.773.386/0001-21')
    expect(text).toContain('Business')
    expect(text).toContain('[e-mail de privacidade]')
    expect(text).toContain('[e-mail de atendimento]')
  })

  it('não mantém referências da Confeitaria3D, planos antigos ou “Rever cookies”', () => {
    const text = collectText(privacySections)

    expect(text).not.toContain('Confeitaria3D')
    expect(text).not.toContain('Livre')
    expect(text).not.toContain('Arte')
    expect(text).not.toMatch(/\bPRO\b/)
    expect(text).not.toContain('Rever cookies')
  })

  it('não possui parágrafos, itens de lista ou subseções vazios', () => {
    for (const section of privacySections) {
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

  it('expõe a data de atualização do texto', () => {
    expect(privacyUpdatedAt).toBe('outubro de 2026')
  })
})
