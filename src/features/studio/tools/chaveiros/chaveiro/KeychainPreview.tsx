import type { BuildKeychainResult } from './buildKeychain'

interface KeychainPreviewProps {
  geometry: BuildKeychainResult | null
  baseColor: string
  letterColor: string
}

export function KeychainPreview({ geometry, baseColor, letterColor }: KeychainPreviewProps) {
  if (!geometry) return null
  return (
    <group>
      <mesh geometry={geometry.base} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh geometry={geometry.text} castShadow>
        <meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />
      </mesh>
    </group>
  )
}
