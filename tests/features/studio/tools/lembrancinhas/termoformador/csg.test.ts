import { describe, it, expect, vi } from 'vitest'
import { BoxGeometry, BufferGeometry } from 'three'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { buildTraySupport, buildTrayPlug } from '@/features/studio/tools/lembrancinhas/termoformador/trayParts'
import { csg, unionParts } from '@/features/studio/tools/lembrancinhas/termoformador/csg'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { isClosed, signedVolume } from './geometryTestUtils'

const cases = [
  { ...defaultThermoformerParams, shape: 'square' as const, width: 120 },
  { ...defaultThermoformerParams, shape: 'pyramid' as const, width: 120 },
  {
    ...defaultThermoformerParams,
    shape: 'rectangle' as const,
    width: 120,
    height: 80,
  },
]

const star = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,3 61,38 98,38 68,59 79,95 50,73 21,95 32,59 2,38 39,38" fill="#000"/>
</svg>`

// Barra de 10 mm entre duas hastes de 40 mm: o degrau de 6 mm fecha o vão e a
// abertura da cavidade se divide em duas ilhas.
const dumbbell = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="0,0 40,0 40,45 60,45 60,0 100,0 100,100 60,100 60,55 40,55 40,100 0,100" fill="#000"/>
</svg>`

function svgOutline(svg: string) {
  const params = {
    ...defaultThermoformerParams,
    shape: 'svg' as const,
    svgSize: 100,
    svg,
  }
  return { params, outline: getShapeOutline(params, parseSvg(svg))! }
}

describe('CSG spike', () => {
  for (const params of cases) {
    it(`fecha suporte e macho ${params.shape}`, () => {
      const outline = getShapeOutline(params)!
      const support = buildTraySupport(params, outline)
      const plug = buildTrayPlug(params, outline)
      expect(isClosed(support)).toBe(true)
      expect(signedVolume(support)).toBeGreaterThan(0)
      expect(isClosed(plug)).toBe(true)
      expect(signedVolume(plug)).toBeGreaterThan(0)
      support.dispose()
      plug.dispose()
    })
  }

  it('fecha suporte e macho svg em estrela', () => {
    const { params, outline } = svgOutline(star)
    const support = buildTraySupport(params, outline)
    const plug = buildTrayPlug(params, outline)
    expect(isClosed(support)).toBe(true)
    expect(signedVolume(support)).toBeGreaterThan(0)
    expect(isClosed(plug)).toBe(true)
    expect(signedVolume(plug)).toBeGreaterThan(0)
    support.dispose()
    plug.dispose()
  })

  it('rejeita abertura de cavidade dividida com erro descritivo', () => {
    const { params, outline } = svgOutline(dumbbell)
    expect(outline.cavityOpening!.length).toBeGreaterThan(1)
    expect(() => buildTraySupport(params, outline)).toThrow(
      'Contorno da abertura da cavidade precisa ser único',
    )
    expect(() => buildTrayPlug(params, outline)).toThrow(
      'Contorno da abertura da cavidade precisa ser único',
    )
  })
})

describe('csg', () => {
  it('devolve a base sem consumir quando não há ferramentas', () => {
    const base = new BoxGeometry(10, 10, 10)
    const dispose = vi.spyOn(base, 'dispose')
    expect(csg(base, [])).toBe(base)
    expect(dispose).not.toHaveBeenCalled()
    base.dispose()
  })

  it('une uma peça sem consumir', () => {
    const part = new BoxGeometry(10, 10, 10)
    const dispose = vi.spyOn(part, 'dispose')
    expect(unionParts([part])).toBe(part)
    expect(dispose).not.toHaveBeenCalled()
    part.dispose()
  })

  it('devolve geometria vazia para lista vazia', () => {
    const union = unionParts([])
    expect(union.getAttribute('position')).toBeUndefined()
    union.dispose()
  })

  it('descarta base e ferramenta no sucesso', () => {
    const base = new BoxGeometry(10, 10, 10)
    const tool = new BoxGeometry(10, 10, 10)
    tool.translate(5, 0, 0)
    const baseDispose = vi.spyOn(base, 'dispose')
    const toolDispose = vi.spyOn(tool, 'dispose')
    const result = csg(base, [tool])
    expect(baseDispose).toHaveBeenCalledTimes(1)
    expect(toolDispose).toHaveBeenCalledTimes(1)
    expect(isClosed(result)).toBe(true)
    result.dispose()
  })

  it('rejeita ferramenta vazia e descarta a base', () => {
    const base = new BoxGeometry(10, 10, 10)
    const empty = new BufferGeometry()
    const baseDispose = vi.spyOn(base, 'dispose')
    const emptyDispose = vi.spyOn(empty, 'dispose')
    expect(() => csg(base, [empty])).toThrow('csg: geometria vazia')
    expect(baseDispose).toHaveBeenCalledTimes(1)
    expect(emptyDispose).toHaveBeenCalledTimes(1)
  })
})
