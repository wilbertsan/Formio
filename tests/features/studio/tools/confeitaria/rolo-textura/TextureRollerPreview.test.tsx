import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TextureRollerPreview } from '@/features/studio/tools/confeitaria/rolo-textura/TextureRollerPreview'

describe('TextureRollerPreview', () => {
  it('não renderiza nada sem geometria', () => {
    const { container } = render(
      <TextureRollerPreview geometry={null} rollerColor="#111111" reliefColor="#f5f5f5" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
