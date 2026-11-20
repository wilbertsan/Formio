import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { BoxGeometry } from 'three'
import { ThermoformerPreview } from '@/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview'

/** Avisos esperados porque jsdom não tem renderer R3F. */
function isExpectedJsxWarning(args: unknown[]): boolean {
  const message = args.map((arg) => String(arg)).join(' ')
  if (/is using incorrect casing/.test(message)) return true
  if (/is unrecognized in this browser/.test(message)) return true
  return (
    /does not recognize the `%s` prop on a DOM element/.test(message) &&
    args.some((arg) => arg === 'castShadow' || arg === 'receiveShadow')
  )
}

describe('ThermoformerPreview', () => {
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

  it('não renderiza nada sem as três peças', () => {
    const { container } = render(
      <ThermoformerPreview
        screen={null}
        support={null}
        plug={null}
        seatY={0}
        plugLift={0}
        color="#14b8a6"
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza suporte, tela e macho nas alturas do preview', () => {
    const { container } = render(
      <ThermoformerPreview
        screen={new BoxGeometry(160, 3, 160)}
        support={new BoxGeometry(168.6, 27, 168.6)}
        plug={new BoxGeometry(160, 46, 160)}
        seatY={24}
        plugLift={61}
        color="#14b8a6"
      />,
    )

    const meshes = container.querySelectorAll('mesh')
    expect(meshes).toHaveLength(3)
    expect(meshes[0]).not.toHaveAttribute('position')
    expect(meshes[1]).toHaveAttribute('position', '0,24,0')
    expect(meshes[2]).toHaveAttribute('position', '0,61,0')

    const materials = container.querySelectorAll('meshstandardmaterial')
    expect(materials).toHaveLength(3)
    for (const material of materials) {
      expect(material).toHaveAttribute('color', '#14b8a6')
    }
  })
})
