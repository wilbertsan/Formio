import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BoxGeometry } from 'three'
import { CanHolderPreview } from '@/features/studio/tools/lembrancinhas/porta-lata/CanHolderPreview'

/** Avisos esperados porque jsdom não tem renderer R3F. */
function isExpectedJsxWarning(args: unknown[]): boolean {
  const message = args.map((arg) => String(arg)).join(' ')
  if (/is using incorrect casing/.test(message)) return true
  if (/is unrecognized in this browser/.test(message)) return true
  return (
    /does not recognize the `%s` prop on a DOM element/.test(message) &&
    args.some(
      (arg) =>
        arg === 'castShadow' || arg === 'receiveShadow' || arg === 'flatShading',
    )
  )
}

/**
 * jsdom descarta props camelCase desconhecidas no DOM; as props que o React
 * passou ao nó ficam no objeto interno `__reactProps$<id>`.
 */
function readHostProps(element: Element): Record<string, unknown> {
  const key = Object.keys(element).find((name) => name.startsWith('__reactProps$'))
  if (!key) throw new Error('Props do React não encontradas no nó')
  return (element as Element & Record<string, Record<string, unknown>>)[key]
}

describe('CanHolderPreview', () => {
  // Os avisos esperados são filtrados; qualquer outro erro de console falha o
  // teste em vez de ser silenciado.
  let unexpectedErrors: unknown[][] = []

  beforeEach(() => {
    unexpectedErrors = []
    const original = console.error
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      if (isExpectedJsxWarning(args)) return
      unexpectedErrors.push(args)
      original(...args)
    })
  })

  afterEach(() => {
    expect(unexpectedErrors).toEqual([])
    vi.restoreAllMocks()
  })

  it('não renderiza nada sem geometria', () => {
    const { container } = render(
      <CanHolderPreview body={null} handle={null} bodyColor="#14b8a6" accentColor="#f5f5f5" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza corpo e alça com as duas cores', () => {
    const { container } = render(
      <CanHolderPreview
        body={new BoxGeometry(80, 88, 80)}
        handle={new BoxGeometry(40, 52, 12)}
        bodyColor="#14b8a6"
        accentColor="#f5f5f5"
      />,
    )

    const meshes = container.querySelectorAll('mesh')
    expect(meshes).toHaveLength(2)

    const materials = container.querySelectorAll('meshstandardmaterial')
    expect(materials).toHaveLength(2)
    expect(materials[0]).toHaveAttribute('color', '#14b8a6')
    expect(materials[1]).toHaveAttribute('color', '#f5f5f5')
  })

  it('aplica flat shading só no corpo quando pedido', () => {
    const { container } = render(
      <CanHolderPreview
        body={new BoxGeometry(80, 88, 80)}
        handle={new BoxGeometry(40, 52, 12)}
        bodyColor="#14b8a6"
        accentColor="#f5f5f5"
        flatShading
      />,
    )

    const materials = container.querySelectorAll('meshstandardmaterial')
    expect(materials).toHaveLength(2)
    expect(readHostProps(materials[0]).flatShading).toBe(true)
    expect(readHostProps(materials[1])).not.toHaveProperty('flatShading')
  })

  it('não aplica flat shading sem a prop', () => {
    const { container } = render(
      <CanHolderPreview
        body={new BoxGeometry(80, 88, 80)}
        handle={new BoxGeometry(40, 52, 12)}
        bodyColor="#14b8a6"
        accentColor="#f5f5f5"
      />,
    )

    const [bodyMaterial] = container.querySelectorAll('meshstandardmaterial')
    expect(readHostProps(bodyMaterial)).not.toHaveProperty('flatShading')
  })

  it('renderiza só o corpo quando a alça está desabilitada', () => {
    const { container } = render(
      <CanHolderPreview body={new BoxGeometry(80, 88, 80)} handle={null} bodyColor="#14b8a6" accentColor="#f5f5f5" />,
    )

    expect(container.querySelectorAll('mesh')).toHaveLength(1)
    expect(container.querySelectorAll('meshstandardmaterial')).toHaveLength(1)
  })
})
