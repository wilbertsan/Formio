import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ThermoformerPreview } from '@/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview'

describe('ThermoformerPreview', () => {
  it('não renderiza nada sem as duas peças', () => {
    const { container } = render(
      <ThermoformerPreview
        screen={null}
        support={null}
        seatY={0}
        color="#14b8a6"
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
