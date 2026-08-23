import { render, screen } from '@testing-library/react'
import { SampleSolid } from '@/features/studio/components/SampleSolid'
import { defaultParameters } from '@/features/studio/config/parameters'

vi.mock('@react-three/drei', () => ({
  RoundedBox: ({
    args,
    radius,
    smoothness,
  }: {
    args: [number, number, number]
    radius: number
    smoothness: number
  }) => (
    <div
      data-testid="rounded-box"
      data-args={args.join(',')}
      data-radius={radius}
      data-smoothness={smoothness}
    />
  ),
  ContactShadows: () => <div data-testid="contact-shadows" />,
}))

describe('SampleSolid', () => {
  it('renderiza o sólido com as dimensões dos parâmetros', () => {
    render(<SampleSolid parameters={defaultParameters} />)
    const box = screen.getByTestId('rounded-box')
    expect(box).toHaveAttribute('data-args', '60,40,30')
    expect(box).toHaveAttribute('data-radius', '4')
    expect(box).toHaveAttribute('data-smoothness', '8')
  })

  it('reflete parâmetros alterados', () => {
    render(
      <SampleSolid
        parameters={{ ...defaultParameters, width: 100, radius: 0, segments: 16 }}
      />,
    )
    const box = screen.getByTestId('rounded-box')
    expect(box).toHaveAttribute('data-args', '100,40,30')
    expect(box).toHaveAttribute('data-radius', '0')
    expect(box).toHaveAttribute('data-smoothness', '16')
  })

  it('renderiza sombras de contato', () => {
    render(<SampleSolid parameters={defaultParameters} />)
    expect(screen.getByTestId('contact-shadows')).toBeInTheDocument()
  })
})
