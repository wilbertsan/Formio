import type { BuildCakeStandResult } from './buildCakeStand'

interface CakeStandPreviewProps {
  geometry: BuildCakeStandResult | null
  baseColor: string
}

export function CakeStandPreview({ geometry, baseColor }: CakeStandPreviewProps) {
  if (!geometry) return null
  return (
    <group>
      <mesh geometry={geometry.base} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh geometry={geometry.column} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.3} />
      </mesh>
      <mesh geometry={geometry.plate} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  )
}