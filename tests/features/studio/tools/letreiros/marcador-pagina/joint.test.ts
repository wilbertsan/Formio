import {
  JOINT_BAR_DEPTH,
  JOINT_BAR_HEIGHT,
  JOINT_CLEARANCE,
  createJointBars,
  splitBaseCenterX,
  splitTextCenterX,
} from '@/features/studio/tools/letreiros/marcador-pagina/joint'

describe('encaixe em U com barras', () => {
  it('define as constantes do encaixe', () => {
    expect(JOINT_BAR_DEPTH).toBe(1.5)
    expect(JOINT_BAR_HEIGHT).toBe(0.8)
    expect(JOINT_CLEARANCE).toBe(0.2)
  })

  it('recua a borda direita da base 0,2mm da traseira do texto', () => {
    expect(splitBaseCenterX(50)).toBe(-25.2)
    expect(splitTextCenterX(1)).toBe(0.5)
  })

  it('cria duas barras com vão igual à espessura da base + folga', () => {
    const bars = createJointBars(40, 1, 1)
    bars.computeBoundingBox()
    const box = bars.boundingBox!

    expect(box.min.x).toBeCloseTo(-1.5)
    expect(box.max.x).toBeCloseTo(0.5)
    expect(box.min.y).toBeCloseTo(-20)
    expect(box.max.y).toBeCloseTo(20)
    expect(box.min.z).toBeCloseTo(-0.8)
    expect(box.max.z).toBeCloseTo(2)

    const positions = bars.getAttribute('position').array as Float32Array
    const zs = new Set<number>()
    for (let i = 0; i < positions.length; i += 3) {
      zs.add(Math.round(positions[i + 2] * 1000) / 1000)
    }
    expect(zs).toContain(0)
    expect(zs).toContain(1.2)
  })
})
