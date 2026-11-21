import type { BufferGeometry } from 'three'

interface CanHolderPreviewProps {
  body: BufferGeometry | null
  handle: BufferGeometry | null
  bodyColor: string
  accentColor: string
  flatShading?: boolean
}

export function CanHolderPreview({
  body,
  handle,
  bodyColor,
  accentColor,
  flatShading = false,
}: CanHolderPreviewProps) {
  if (!body && !handle) return null

  return (
    <group>
      {body && (
        <mesh geometry={body} castShadow receiveShadow>
          <meshStandardMaterial
            color={bodyColor}
            metalness={0.05}
            roughness={0.5}
            {...(flatShading ? { flatShading } : {})}
          />
        </mesh>
      )}
      {handle && (
        <mesh geometry={handle} castShadow receiveShadow>
          <meshStandardMaterial color={accentColor} metalness={0.05} roughness={0.5} />
        </mesh>
      )}
    </group>
  )
}
