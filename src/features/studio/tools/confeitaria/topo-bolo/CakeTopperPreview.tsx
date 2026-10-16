import type { BuildCakeTopperResult } from './buildCakeTopper'

interface CakeTopperPreviewProps {
  geometry: BuildCakeTopperResult | null
  baseColor: string
  letterColor: string
}

export function CakeTopperPreview({ geometry, baseColor, letterColor }: CakeTopperPreviewProps) {
  if (!geometry) return null

  return (
    <group>
      <mesh geometry={geometry.plate} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      {geometry.relief && (
        <mesh geometry={geometry.relief} castShadow receiveShadow>
          <meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
      {geometry.support && (
        <mesh geometry={geometry.support} castShadow receiveShadow>
          <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
        </mesh>
      )}
    </group>
  )
}
