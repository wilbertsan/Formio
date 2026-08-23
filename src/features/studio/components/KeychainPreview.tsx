import type { BufferGeometry } from 'three'
import { ContactShadows } from '@react-three/drei'

interface KeychainPreviewProps {
  geometry: BufferGeometry | null
}

export function KeychainPreview({ geometry }: KeychainPreviewProps) {
  if (!geometry) return null
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#14b8a6" metalness={0.1} roughness={0.4} />
      </mesh>
      <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={120} blur={2} far={20} />
    </group>
  )
}
