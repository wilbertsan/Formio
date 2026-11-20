import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BoxGeometry } from 'three'
import { ThermoformerPreview } from '@/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview'

describe('ThermoformerPreview', () => {
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
        plugLift={44}
        color="#14b8a6"
      />,
    )

    const meshes = container.querySelectorAll('mesh')
    expect(meshes).toHaveLength(3)
    expect(meshes[0]).not.toHaveAttribute('position')
    expect(meshes[1]).toHaveAttribute('position', '0,24,0')
    expect(meshes[2]).toHaveAttribute('position', '0,44,0')
    expect(container.querySelectorAll('meshstandardmaterial')).toHaveLength(3)
  })
})
