import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BoxGeometry } from 'three'
import { MugPreview } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/MugPreview'

describe('MugPreview', () => {
  // jsdom não tem renderer R3F: as tags customizadas geram avisos do React que
  // não indicam falha. O teste valida a árvore DOM renderizada.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('não renderiza nada sem geometria', () => {
    const { container } = render(
      <MugPreview body={null} handle={null} bodyColor="#14b8a6" accentColor="#f5f5f5" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza corpo e alça com as duas cores', () => {
    const { container } = render(
      <MugPreview
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

  it('renderiza só o corpo quando a alça está desabilitada', () => {
    const { container } = render(
      <MugPreview body={new BoxGeometry(80, 88, 80)} handle={null} bodyColor="#14b8a6" accentColor="#f5f5f5" />,
    )

    expect(container.querySelectorAll('mesh')).toHaveLength(1)
    expect(container.querySelectorAll('meshstandardmaterial')).toHaveLength(1)
  })
})
