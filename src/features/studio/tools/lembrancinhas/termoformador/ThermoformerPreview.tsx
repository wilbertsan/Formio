import type { BuildThermoformerResult } from './buildThermoformer'

interface ThermoformerPreviewProps {
  geometry: BuildThermoformerResult | null
  bodyColor: string
  accentColor: string
}

export function ThermoformerPreview({
  geometry,
  bodyColor,
  accentColor,
}: ThermoformerPreviewProps) {
  if (!geometry) return null

  return (
    <group>
      <mesh geometry={geometry.body} castShadow receiveShadow>
        <meshStandardMaterial color={bodyColor} metalness={0.1} roughness={0.4} />
      </mesh>
      {geometry.lid && (
        <mesh geometry={geometry.lid} castShadow receiveShadow>
          <meshStandardMaterial color={accentColor} metalness={0.1} roughness={0.4} />
        </mesh>
      )}
      <mesh geometry={geometry.frontPanel} castShadow receiveShadow>
        <meshStandardMaterial color={accentColor} metalness={0.1} roughness={0.35} />
      </mesh>
      {geometry.handle && (
        <mesh geometry={geometry.handle} castShadow receiveShadow>
          <meshStandardMaterial color={accentColor} metalness={0.1} roughness={0.4} />
        </mesh>
      )}
      {geometry.base && (
        <mesh geometry={geometry.base} castShadow receiveShadow>
          <meshStandardMaterial color={accentColor} metalness={0.1} roughness={0.45} />
        </mesh>
      )}
    </group>
  )
}
