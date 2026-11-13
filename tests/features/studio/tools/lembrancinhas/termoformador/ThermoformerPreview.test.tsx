import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ThermoformerPreview } from '@/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview'

describe('ThermoformerPreview', () => {
  it('não renderiza nada sem geometria', () => {
    const { container } = render(
      <ThermoformerPreview geometry={null} bodyColor="#22c55e" accentColor="#f5f5f5" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
