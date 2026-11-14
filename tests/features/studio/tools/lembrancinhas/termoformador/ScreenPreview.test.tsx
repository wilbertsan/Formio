import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ScreenPreview } from '@/features/studio/tools/lembrancinhas/termoformador/ScreenPreview'

describe('ScreenPreview', () => {
  it('não renderiza nada sem geometria', () => {
    const { container } = render(
      <ScreenPreview geometry={null} color="#14b8a6" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
