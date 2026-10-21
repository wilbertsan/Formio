import { BufferAttribute, BufferGeometry } from 'three'
import { END_FILLET_MM, MESH_STEP_MM, type TextureRollerParams } from './schema'

interface ProfileSample { x: number; radius: number }

// Perfil de revolução: cilindro fechado com tampas planas e filetes de borda.
function buildProfile(params: TextureRollerParams): ProfileSample[] {
  const half = params.length / 2
  const bodyRadius = params.diameter / 2
  const fillet = Math.min(END_FILLET_MM, bodyRadius / 2, params.length / 4)
  const capRadius = Math.max(0.001, bodyRadius - fillet)
  const samples: ProfileSample[] = []
  const filletSteps = Math.max(2, Math.ceil(((Math.PI / 2) * fillet) / MESH_STEP_MM))

  // Tampa esquerda (apex + anel) e filete.
  samples.push({ x: -half, radius: 0 })
  samples.push({ x: -half, radius: capRadius })
  for (let k = 1; k < filletSteps; k++) {
    const angle = Math.PI - (Math.PI / 2) * (k / filletSteps)
    samples.push({
      x: -half + fillet + fillet * Math.cos(angle),
      radius: capRadius + fillet * Math.sin(angle),
    })
  }

  // Corpo cilíndrico.
  const sideStart = -half + fillet
  const sideEnd = half - fillet
  const sideSteps = Math.max(1, Math.ceil((sideEnd - sideStart) / MESH_STEP_MM))
  for (let i = 0; i <= sideSteps; i++) {
    const x = sideStart + ((sideEnd - sideStart) * i) / sideSteps
    samples.push({ x, radius: bodyRadius })
  }

  // Filete e tampa direita.
  for (let k = 1; k < filletSteps; k++) {
    const angle = Math.PI / 2 + (Math.PI / 2) * (k / filletSteps)
    samples.push({
      x: half - fillet - fillet * Math.cos(angle),
      radius: capRadius + fillet * Math.sin(angle),
    })
  }
  samples.push({ x: half, radius: capRadius })
  samples.push({ x: half, radius: 0 })

  return samples
}

export function buildBody(params: TextureRollerParams): BufferGeometry {
  const nSegments = Math.max(64, Math.ceil((Math.PI * params.diameter) / MESH_STEP_MM))
  const profile = buildProfile(params)
  const positions: number[] = []
  const rings: { start: number; apex: boolean }[] = []

  for (const sample of profile) {
    const start = positions.length / 3
    if (sample.radius < 1e-4) {
      positions.push(sample.x, 0, 0)
      rings.push({ start, apex: true })
      continue
    }
    for (let j = 0; j < nSegments; j++) {
      const a = (j / nSegments) * Math.PI * 2
      positions.push(sample.x, sample.radius * Math.cos(a), sample.radius * Math.sin(a))
    }
    rings.push({ start, apex: false })
  }

  const indices: number[] = []

  for (let i = 0; i + 1 < rings.length; i++) {
    const a = rings[i]
    const b = rings[i + 1]
    if (a.apex || b.apex) {
      if (a.apex) {
        for (let j = 0; j < nSegments; j++) {
          const j2 = (j + 1) % nSegments
          indices.push(a.start, b.start + j2, b.start + j)
        }
      } else {
        for (let j = 0; j < nSegments; j++) {
          const j2 = (j + 1) % nSegments
          indices.push(b.start, a.start + j, a.start + j2)
        }
      }
      continue
    }
    for (let j = 0; j < nSegments; j++) {
      const j2 = (j + 1) % nSegments
      indices.push(a.start + j, b.start + j2, b.start + j)
      indices.push(a.start + j, a.start + j2, b.start + j2)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
