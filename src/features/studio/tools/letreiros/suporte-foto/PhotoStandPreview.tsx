import type { BuildPhotoStandResult } from './buildPhotoStand'

interface PhotoStandPreviewProps {
  geometry: BuildPhotoStandResult | null
  baseColor: string
  letterColor: string
}

export function PhotoStandPreview({ geometry, baseColor, letterColor }: PhotoStandPreviewProps) {
  if (!geometry) return null
  return (
    <group>
      <mesh geometry={geometry.leftText} castShadow receiveShadow>
        <meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />
      </mesh>
      <mesh geometry={geometry.rightText} castShadow receiveShadow>
        <meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />
      </mesh>
      <mesh geometry={geometry.base} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  )
}
