import { RoundedBox, ContactShadows } from '@react-three/drei'
import type { ModelParameters } from '../config/parameters'

interface SampleSolidProps {
  parameters: ModelParameters
}

export function SampleSolid({ parameters }: SampleSolidProps) {
  return (
    <group>
      <RoundedBox
        args={[parameters.width, parameters.height, parameters.depth]}
        radius={parameters.radius}
        smoothness={parameters.segments}
        position={[0, parameters.height / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#14b8a6" metalness={0.1} roughness={0.4} />
      </RoundedBox>
      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={150} blur={2} far={20} />
    </group>
  )
}
