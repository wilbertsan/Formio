import type { BuildTextureRollerResult } from './buildTextureRoller'

interface TextureRollerPreviewProps {
  geometry: BuildTextureRollerResult | null
  rollerColor: string
  reliefColor: string
}

export function TextureRollerPreview({ geometry, rollerColor, reliefColor }: TextureRollerPreviewProps) {
  if (!geometry) return null

  return (
    <mesh geometry={geometry.roller} castShadow receiveShadow>
      <meshStandardMaterial attach="material-0" color={rollerColor} metalness={0.1} roughness={0.4} />
      <meshStandardMaterial attach="material-1" color={reliefColor} metalness={0.1} roughness={0.35} />
    </mesh>
  )
}
