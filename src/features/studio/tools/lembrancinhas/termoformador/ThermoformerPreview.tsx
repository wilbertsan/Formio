import type { BufferGeometry } from 'three'

interface ThermoformerPreviewProps {
  screen: BufferGeometry | null
  support: BufferGeometry | null
  plug: BufferGeometry | null
  seatY: number
  plugLift: number
  color: string
}

export function ThermoformerPreview({
  screen,
  support,
  plug,
  seatY,
  plugLift,
  color,
}: ThermoformerPreviewProps) {
  if (!screen || !support || !plug) return null

  return (
    <group>
      <mesh geometry={support} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.45} />
      </mesh>
      <mesh geometry={screen} position={[0, seatY, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh geometry={plug} position={[0, plugLift, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.45} />
      </mesh>
    </group>
  )
}
