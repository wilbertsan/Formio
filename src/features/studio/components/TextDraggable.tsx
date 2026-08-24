import { useCallback, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { BufferGeometry } from 'three'
import { clampTextPosition, type BoundingBox2D, type Circle2D } from '../keychain/positioning'

interface TextDraggableProps {
  id: string
  geometry: BufferGeometry
  x: number
  y: number
  z: number
  letterColor: string
  selected: boolean
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  pieceBB: BoundingBox2D | null
  hole: Circle2D | null
  halfWidth: number
  halfHeight: number
}

export function TextDraggable({
  id,
  geometry,
  x,
  y,
  z,
  letterColor,
  selected,
  onSelect,
  onMove,
  pieceBB,
  hole,
  halfWidth,
  halfHeight,
}: TextDraggableProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const dragging = useRef(false)
  const { camera, gl } = useThree()
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
  const raycaster = useRef(new THREE.Raycaster())
  const offset = useRef(new THREE.Vector3())

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      onSelect(id)
      dragging.current = true
      gl.domElement.style.cursor = 'grabbing'
      if (meshRef.current) {
        const intersection = new THREE.Vector3()
        raycaster.current.setFromCamera(
          new THREE.Vector2(
            (event.clientX / gl.domElement.clientWidth) * 2 - 1,
            -(event.clientY / gl.domElement.clientHeight) * 2 + 1,
          ),
          camera,
        )
        raycaster.current.ray.intersectPlane(plane.current, intersection)
        offset.current.copy(intersection).sub(new THREE.Vector3(x, y, z))
      }
    },
    [id, x, y, z, camera, gl, onSelect],
  )

  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!dragging.current) return
      event.stopPropagation()
      raycaster.current.setFromCamera(
        new THREE.Vector2(
          (event.clientX / gl.domElement.clientWidth) * 2 - 1,
          -(event.clientY / gl.domElement.clientHeight) * 2 + 1,
        ),
        camera,
      )
      const intersection = new THREE.Vector3()
      raycaster.current.ray.intersectPlane(plane.current, intersection)
      const newPos = intersection.sub(offset.current)
      if (meshRef.current) {
        if (pieceBB && hole) {
          const clamped = clampTextPosition(
            { x: newPos.x, y: newPos.y, halfWidth, halfHeight },
            pieceBB,
            hole,
          )
          newPos.x = clamped.x
          newPos.y = clamped.y
        }
        meshRef.current.position.x = newPos.x
        meshRef.current.position.y = newPos.y
      }
    },
    [camera, gl, pieceBB, hole, halfWidth, halfHeight],
  )

  const onPointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!dragging.current) return
      event.stopPropagation()
      dragging.current = false
      gl.domElement.style.cursor = 'auto'
      if (meshRef.current) {
        onMove(id, meshRef.current.position.x, meshRef.current.position.y)
      }
    },
    [id, gl, onMove],
  )

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[x, y, z]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      castShadow
    >
      <meshStandardMaterial
        color={letterColor}
        emissive={selected ? '#0d9488' : '#000000'}
        emissiveIntensity={selected ? 0.15 : 0}
        metalness={0.1}
        roughness={0.3}
      />
    </mesh>
  )
}
