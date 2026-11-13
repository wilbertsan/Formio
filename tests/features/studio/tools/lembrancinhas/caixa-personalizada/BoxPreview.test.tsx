import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BoxPreview } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/BoxPreview'

describe('BoxPreview', () => {
  it('não renderiza nada sem geometria', () => {
    const { container } = render(
      <BoxPreview geometry={null} bodyColor="#22c55e" accentColor="#f5f5f5" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
