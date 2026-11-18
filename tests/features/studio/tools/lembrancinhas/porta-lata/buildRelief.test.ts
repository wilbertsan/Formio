import { describe, it, expect } from 'vitest'
import { Shape, Vector3, type BufferGeometry } from 'three'
import { FontLoader, type Font, type FontData } from 'three/examples/jsm/loaders/FontLoader.js'
import helvetikerRegular from '@/assets/fonts/helvetiker_regular.typeface.json'
import {
  buildRelief,
  fitRelief,
} from '@/features/studio/tools/lembrancinhas/porta-lata/buildRelief'
import {
  CONTENT_DEPTH,
  MAX_TEXT_ARC,
  RELIEF_EMBED,
  TEXT_BAND_MARGIN_MM,
  defaultCanHolderParams,
  getEffectiveRimChamfer,
  getOuterHeight,
  getOuterRadius,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import {
  shapesToGeometry,
  textToShapes,
} from '@/features/studio/tools/confeitaria/shared/textOutline'
import { isClosed, signedVolume } from './geometryTestUtils'

/** Posições são Float32Array: ~1e-6 de erro absoluto em coordenadas de mm. */
const POSITION_EPSILON = 1e-5

/** Centro de massa do sólido (tetraedros a partir da origem). */
function volumeCentroid(geometry: BufferGeometry): Vector3 {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const count = index ? index.count : position.count
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const cross = new Vector3()
  const sum = new Vector3()
  let volume = 0

  for (let i = 0; i < count; i += 3) {
    const ia = index ? index.getX(i) : i
    const ib = index ? index.getX(i + 1) : i + 1
    const ic = index ? index.getX(i + 2) : i + 2
    a.fromBufferAttribute(position, ia)
    b.fromBufferAttribute(position, ib)
    c.fromBufferAttribute(position, ic)
    const tetVolume = a.dot(cross.crossVectors(b, c)) / 6
    volume += tetVolume
    sum.addScaledVector(a.add(b).add(c), tetVolume / 4)
  }

  return sum.divideScalar(volume)
}

function rectangleFont(width: number, height: number): Font {
  return {
    data: { glyphs: {} },
    generateShapes: () => {
      const shape = new Shape()
      shape.moveTo(-width / 2, -height / 2)
      shape.lineTo(width / 2, -height / 2)
      shape.lineTo(width / 2, height / 2)
      shape.lineTo(-width / 2, height / 2)
      shape.closePath()
      return [shape]
    },
  } as unknown as Font
}

describe('buildRelief', () => {
  it('curva o texto no raio cilíndrico e mantém 1 mm de relevo', () => {
    const params = { ...defaultCanHolderParams, text: 'Festa' }
    const geometry = buildRelief(rectangleFont(20, 10), params)!
    const position = geometry.getAttribute('position')
    // O corpo é cilíndrico: cada vértice fica entre RELIEF_EMBED dentro da
    // parede e CONTENT_DEPTH acima dela, em qualquer y.
    let minOffset = Infinity
    let maxOffset = -Infinity

    for (let i = 0; i < position.count; i++) {
      const offset = Math.hypot(position.getX(i), position.getZ(i))
        - getOuterRadius(params)
      minOffset = Math.min(minOffset, offset)
      maxOffset = Math.max(maxOffset, offset)
    }

    expect(minOffset).toBeCloseTo(-RELIEF_EMBED, 5)
    expect(maxOffset).toBeCloseTo(CONTENT_DEPTH, 5)
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })

  it('gera relevo com volume positivo (winding para fora)', () => {
    const geometry = buildRelief(rectangleFont(20, 10), { ...defaultCanHolderParams, text: 'Festa' })!
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('não espelha o texto: o eixo z acompanha o x do texto plano', () => {
    const font = new FontLoader().parse(helvetikerRegular as unknown as FontData)
    const params = { ...defaultCanHolderParams, text: 'F' }
    const flat = shapesToGeometry(
      textToShapes(font, params.text, params.textSize),
      CONTENT_DEPTH + RELIEF_EMBED,
      false,
    )
    flat.computeBoundingBox()
    const centerX = (flat.boundingBox!.min.x + flat.boundingBox!.max.x) / 2
    const flatOffsetX = volumeCentroid(flat).x - centerX
    const bent = buildRelief(font, params)!
    const bentCentroidZ = volumeCentroid(bent).z

    // 'F' tem a haste à esquerda e os braços à direita: o centro de massa fica
    // longe do centro da caixa, então o sinal é observável.
    expect(Math.abs(flatOffsetX)).toBeGreaterThan(0.5)
    // O mapeamento é z ≈ +x. Com `Math.PI + x / R` o z sairia com o sinal
    // oposto (texto espelhado). A caixa delimitadora não pega a reflexão, pois
    // ela preserva os extremos; o centro de massa sim.
    expect(Math.sign(bentCentroidZ)).toBe(Math.sign(flatOffsetX))

    flat.dispose()
    bent.dispose()
  })

  it('centraliza o texto em 180° (lado oposto à alça)', () => {
    const params = { ...defaultCanHolderParams, text: 'Festa' }
    const geometry = buildRelief(rectangleFont(10, 8), params)!
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.x).toBeLessThan(0)
    expect(geometry.boundingBox!.min.y).toBeGreaterThan(params.textCenterY - params.textSize / 2 - 2)
    expect(geometry.boundingBox!.max.y).toBeLessThan(params.textCenterY + params.textSize / 2 + 2)
    geometry.dispose()
  })

  it('clampa o texto para dentro da parede quando o centro pede a borda', () => {
    const params = { ...defaultCanHolderParams, textCenterY: 120 }
    const geometry = buildRelief(rectangleFont(10, 4), params)!
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const ceiling =
      getOuterHeight(params) - getEffectiveRimChamfer(params) - TEXT_BAND_MARGIN_MM

    expect(box.min.y).toBeGreaterThanOrEqual(params.bottomThickness + TEXT_BAND_MARGIN_MM - POSITION_EPSILON)
    expect(box.max.y).toBeLessThanOrEqual(ceiling + POSITION_EPSILON)
    expect(box.max.y).toBeCloseTo(ceiling, 5)
    geometry.dispose()
  })

  it('clampa o texto com o chanfro efetivo quando o chanfro pedido é limitado', () => {
    // Parede 2,4 mm: o chanfro efetivo é 0,6 mm, não os 2 mm pedidos.
    const params = {
      ...defaultCanHolderParams,
      rimChamfer: 2,
      wallThickness: 2.4,
      textCenterY: 120,
    }
    const chamfer = getEffectiveRimChamfer(params)
    expect(chamfer).toBeLessThan(params.rimChamfer)

    const geometry = buildRelief(rectangleFont(10, 4), params)!
    geometry.computeBoundingBox()
    const ceiling = getOuterHeight(params) - chamfer - TEXT_BAND_MARGIN_MM

    // O topo fica exatamente no limite efetivo: com o rimChamfer cru (2 mm) o
    // clamp antigo pararia mais abaixo.
    expect(geometry.boundingBox!.max.y).toBeLessThanOrEqual(ceiling + POSITION_EPSILON)
    expect(geometry.boundingBox!.max.y).toBeCloseTo(ceiling, 5)
    geometry.dispose()
  })

  it('respeita o chanfro efetivo quando o lead-in limita o perfil', () => {
    // Com lead-in 2 mm e parede 2,6 mm o schema zera o chanfro (lead-in
    // efetivo 1,8 mm), então o topo do relevo pode subir até o limite real.
    const params = {
      ...defaultCanHolderParams,
      rimChamfer: 2,
      rimLeadIn: 2,
      wallThickness: 2.6,
      textCenterY: 120,
    }
    expect(getEffectiveRimChamfer(params)).toBeCloseTo(0, 6)

    const geometry = buildRelief(rectangleFont(10, 4), params)!
    geometry.computeBoundingBox()
    const ceiling = getOuterHeight(params) - getEffectiveRimChamfer(params) - TEXT_BAND_MARGIN_MM

    expect(geometry.boundingBox!.max.y).toBeCloseTo(ceiling, 5)
    geometry.dispose()
  })

  it('clampa o texto dentro do corpo mais curto (cavidade 80)', () => {
    const params = {
      ...defaultCanHolderParams,
      cavityDepth: 80,
      textCenterY: 120,
    }
    const geometry = buildRelief(rectangleFont(10, 4), params)!
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const ceiling =
      getOuterHeight(params) - getEffectiveRimChamfer(params) - TEXT_BAND_MARGIN_MM

    expect(getOuterHeight(params)).toBeCloseTo(83.2, 5)
    expect(box.min.y).toBeGreaterThanOrEqual(params.bottomThickness + TEXT_BAND_MARGIN_MM - POSITION_EPSILON)
    expect(box.max.y).toBeLessThanOrEqual(ceiling + POSITION_EPSILON)
    expect(box.max.y).toBeCloseTo(ceiling, 5)
    geometry.dispose()
  })

  it('reduz textos longos para não passar do arco máximo', () => {
    const params = { ...defaultCanHolderParams, textSize: 18 }
    const geometry = buildRelief(rectangleFont(400, 18), params)!
    const position = geometry.getAttribute('position')
    let minAngle = Infinity
    let maxAngle = -Infinity

    for (let i = 0; i < position.count; i++) {
      const angle = Math.atan2(position.getZ(i), position.getX(i))
      const centered = angle > 0 ? angle - Math.PI * 2 : angle
      minAngle = Math.min(minAngle, centered)
      maxAngle = Math.max(maxAngle, centered)
    }

    expect(maxAngle - minAngle).toBeLessThanOrEqual(MAX_TEXT_ARC + 0.02)
    geometry.dispose()
  })

  it('mantém a superfície do relevo a ~1 mm da parede em glifos largos', () => {
    const params = { ...defaultCanHolderParams, textSize: 18 }
    const geometry = buildRelief(rectangleFont(20, 10), params)!
    const position = geometry.getAttribute('position')
    const a = new Vector3()
    const b = new Vector3()
    const c = new Vector3()
    const ab = new Vector3()
    const ac = new Vector3()
    const normal = new Vector3()
    const radial = new Vector3()
    const centroid = new Vector3()
    let minVisible = Infinity

    for (let i = 0; i < position.count; i += 3) {
      a.fromBufferAttribute(position, i)
      b.fromBufferAttribute(position, i + 1)
      c.fromBufferAttribute(position, i + 2)
      centroid.copy(a).add(b).add(c).divideScalar(3)

      const radius = Math.hypot(centroid.x, centroid.z)
      radial.set(centroid.x / radius, 0, centroid.z / radius)
      normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)).normalize()
      // Só a face da frente: normal radial para fora.
      if (normal.dot(radial) <= 0.5) continue

      minVisible = Math.min(
        minVisible,
        radius - getOuterRadius(params),
      )
    }

    // Um glifo largo sem subdivisão afunda no meio da corda (sag).
    expect(minVisible).toBeGreaterThan(0.95)
    expect(minVisible).toBeLessThanOrEqual(CONTENT_DEPTH + 0.02)
    geometry.dispose()
  })

  it('mantém 1 mm de relevo em parede, folga e profundidade extremas', () => {
    const params = {
      ...defaultCanHolderParams,
      cavityDepth: 116,
      canClearance: 0.5,
      wallThickness: 4,
      rimChamfer: 1.5,
      textCenterY: 90,
    }
    const geometry = buildRelief(rectangleFont(20, 10), params)!
    const position = geometry.getAttribute('position')
    let minOffset = Infinity
    let maxOffset = -Infinity

    for (let i = 0; i < position.count; i++) {
      const offset = Math.hypot(position.getX(i), position.getZ(i))
        - getOuterRadius(params)
      minOffset = Math.min(minOffset, offset)
      maxOffset = Math.max(maxOffset, offset)
    }

    expect(minOffset).toBeCloseTo(-RELIEF_EMBED, 5)
    expect(maxOffset).toBeCloseTo(CONTENT_DEPTH, 5)
    geometry.dispose()
  })

  it('texto vazio não gera geometria', () => {
    expect(buildRelief(rectangleFont(10, 10), { ...defaultCanHolderParams, text: '   ' })).toBeNull()
  })
})

describe('fitRelief', () => {
  it('mantém escala 1 quando o texto cabe no arco', () => {
    expect(fitRelief(10, 40)).toBe(1)
  })

  it('reduz proporcionalmente quando o texto excede o arco', () => {
    expect(fitRelief(200, 40)).toBeCloseTo(MAX_TEXT_ARC / (200 / 40), 9)
  })

  it('não divide por zero em entradas degeneradas', () => {
    expect(fitRelief(0, 40)).toBe(1)
    expect(fitRelief(10, 0)).toBe(1)
  })
})
