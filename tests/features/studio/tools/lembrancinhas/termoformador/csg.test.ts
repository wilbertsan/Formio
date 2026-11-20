import { describe, it, expect, vi } from 'vitest'
import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
} from 'three'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { buildTraySupport, buildTrayPlug } from '@/features/studio/tools/lembrancinhas/termoformador/trayParts'
import {
  csg,
  splitTJunctions,
  unionParts,
} from '@/features/studio/tools/lembrancinhas/termoformador/csg'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import {
  countZeroAreaTriangles,
  isClosed,
  signedVolume,
} from './geometryTestUtils'

const cases = [
  {
    params: {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
    },
    supportVolume: 177090.22,
    plugVolume: 584126.35,
  },
  {
    params: {
      ...defaultThermoformerParams,
      shape: 'pyramid' as const,
      width: 120,
    },
    supportVolume: 316578.28,
    plugVolume: 444638.28,
  },
  {
    params: {
      ...defaultThermoformerParams,
      shape: 'rectangle' as const,
      width: 120,
      height: 80,
    },
    supportVolume: 139025.6,
    plugVolume: 372974.93,
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
  for (const { params, supportVolume, plugVolume } of cases) {
    it(`fecha suporte e macho ${params.shape}`, () => {
      const outline = getShapeOutline(params)!
      const support = buildTraySupport(params, outline)
      const plug = buildTrayPlug(params, outline)
      expect(isClosed(support)).toBe(true)
      expect(signedVolume(support)).toBeCloseTo(supportVolume, 0)
      expect(isClosed(plug)).toBe(true)
      expect(signedVolume(plug)).toBeCloseTo(plugVolume, 0)
      expect(countZeroAreaTriangles(support)).toBe(0)
      expect(countZeroAreaTriangles(plug)).toBe(0)
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
    expect(countZeroAreaTriangles(support)).toBe(0)
    expect(countZeroAreaTriangles(plug)).toBe(0)
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

describe('splitTJunctions', () => {
  it('não altera aresta não manifold', () => {
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        [
          0, 0, 0,
          10, 0, 0,
          0, 10, 0,
          0, -10, 0,
          3, 3, 5,
        ],
        3,
      ),
    )
    const index = [0, 1, 2, 1, 0, 3, 0, 1, 4]
    geometry.setIndex(index)
    splitTJunctions(geometry)
    expect(Array.from(geometry.getIndex()!.array)).toEqual(index)
    geometry.dispose()
  })

  it('repara pontos em duas arestas sem triângulos sem área', () => {
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        [
          0, 0, 0,
          10, 0, 0,
          0, 10, 0,
          5, 0, 0,
          5, 5, 0,
          5, 0, 5,
          8, 3, 5,
        ],
        3,
      ),
    )
    // O triângulo 0 tem P e Q sobre duas arestas abertas; os triângulos 1 e 2
    // só mantêm P e Q como extremos de arestas abertas.
    geometry.setIndex([0, 1, 2, 3, 5, 6, 4, 5, 6])
    splitTJunctions(geometry)
    expect(geometry.getIndex()!.count).toBe(5 * 3)
    expect(countZeroAreaTriangles(geometry)).toBe(0)
    geometry.dispose()
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

  it('rejeita ferramenta com índice vazio e descarta a base', () => {
    const base = new BoxGeometry(10, 10, 10)
    const emptyIndex = new BufferGeometry()
    emptyIndex.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
    )
    emptyIndex.setIndex([])
    const baseDispose = vi.spyOn(base, 'dispose')
    const emptyDispose = vi.spyOn(emptyIndex, 'dispose')
    expect(() => csg(base, [emptyIndex])).toThrow(
      'csg: geometria vazia (ferramenta)',
    )
    expect(baseDispose).toHaveBeenCalledTimes(1)
    expect(emptyDispose).toHaveBeenCalledTimes(1)
  })
})
