import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CutterStampPreview } from '@/features/studio/tools/confeitaria/cortador-carimbo/CutterStampPreview'

describe('CutterStampPreview', () => {
  it('não renderiza nada sem geometria', () => {
    const { container } = render(
      <CutterStampPreview geometry={null} cutterColor="#111111" stampColor="#f5f5f5" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
