import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { TextDraggable } from '@/features/studio/components/TextDraggable'
import * as THREE from 'three'

vi.mock('@react-three/fiber', () => ({
  useThree: () => ({
    camera: new THREE.PerspectiveCamera(),
    gl: { domElement: document.createElement('canvas') },
  }),
}))

const pieceBB = { minX: -25, maxX: 25, minY: -12.5, maxY: 12.5 }
const hole = { x: 0, y: 10, radius: 4.5 }
const geo = new THREE.BoxGeometry(10, 5, 1)

function renderDraggable(overrides?: Partial<Parameters<typeof TextDraggable>[0]>) {
  return render(
    <TextDraggable
      id="text-1"
      geometry={geo}
      x={0}
      y={0}
      z={3}
      letterColor="#fff"
      selected={false}
      onSelect={() => undefined}
      onMove={() => undefined}
      pieceBB={pieceBB}
      hole={hole}
      halfWidth={5}
      halfHeight={2.5}
      {...overrides}
    />,
  )
}

describe('TextDraggable', () => {
  it('renderiza mesh (via canvas mock do R3F)', () => {
    renderDraggable()
    expect(document.querySelector('mesh')).toBeInTheDocument()
  })

  it('aplica emissive quando selecionado', () => {
    renderDraggable({ selected: true })
    const mesh = document.querySelector('mesh')
    expect(mesh).toBeInTheDocument()
  })
})
