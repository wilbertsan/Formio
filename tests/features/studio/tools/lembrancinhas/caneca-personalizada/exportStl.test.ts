import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { BoxGeometry, BufferGeometry } from 'three'
import {
  exportMugStl,
  prepareBodyForPrint,
  prepareHandleForPrint,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/exportStl'
import { buildHandle } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle'
import type { BuildMugResult } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { getBandOuterRadius } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/shapes'

const { parseMock } = vi.hoisted(() => ({
  parseMock: vi.fn(() => new DataView(new ArrayBuffer(84))),
}))

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class {
    parse = parseMock
  },
}))

const originalCreateObjectURL = Object.getOwnPropertyDescriptor(window.URL, 'createObjectURL')
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(window.URL, 'revokeObjectURL')

type Anchor = {
  click: ReturnType<typeof vi.fn>
  href: string
  download: string
}

type DownloadMocksOptions = {
  clickThrows?: boolean
}

function setupDownloadMocks(options: DownloadMocksOptions = {}) {
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: createObjectURL,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: revokeObjectURL,
    writable: true,
    configurable: true,
  })

  const anchors: Anchor[] = []
  const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(() => {
    const anchor = {
      click: vi.fn(() => {
        if (options.clickThrows) throw new Error('click falhou')
      }),
      href: '',
      download: '',
    }
    anchors.push(anchor)
    return anchor as never
  })
  const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as never)
  const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as never)
  return { anchors, appendChildSpy, removeChildSpy, createObjectURL, revokeObjectURL, createElementSpy }
}

function positions(geometry: BufferGeometry): Float32Array {
  return Float32Array.from(geometry.getAttribute('position').array)
}

function restoreUrlDescriptors(): void {
  if (originalCreateObjectURL) {
    Object.defineProperty(window.URL, 'createObjectURL', originalCreateObjectURL)
  } else {
    Reflect.deleteProperty(window.URL, 'createObjectURL')
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(window.URL, 'revokeObjectURL', originalRevokeObjectURL)
  } else {
    Reflect.deleteProperty(window.URL, 'revokeObjectURL')
  }
}

beforeEach(() => {
  parseMock.mockImplementation(() => new DataView(new ArrayBuffer(84)))
})

afterEach(() => {
  vi.restoreAllMocks()
  restoreUrlDescriptors()
})

describe('exportMugStl', () => {
  it('baixa corpo e alça com o nome do projeto', () => {
    const { anchors, appendChildSpy, removeChildSpy, createObjectURL, revokeObjectURL } =
      setupDownloadMocks()
    parseMock.mockClear()
    const result: BuildMugResult = {
      body: new BoxGeometry(80, 88, 80),
      handle: new BoxGeometry(52, 43, 12),
    }
    const bodyOriginal = positions(result.body)
    const handleOriginal = positions(result.handle!)
    const cloneSpy = vi.spyOn(BufferGeometry.prototype, 'clone')
    const disposeSpy = vi.spyOn(BufferGeometry.prototype, 'dispose')

    exportMugStl(result, 'Caneca da Ana!')

    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'Caneca-da-Ana-corpo.stl',
      'Caneca-da-Ana-alca.stl',
    ])
    for (const anchor of anchors) {
      expect(anchor.href).toBe('blob:mock-url')
      expect(anchor.click).toHaveBeenCalledTimes(1)
    }
    // Uma URL por peça, sempre revogada.
    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(appendChildSpy).toHaveBeenCalledTimes(2)
    expect(removeChildSpy).toHaveBeenCalledTimes(2)
    // O exportador roda uma vez por peça, sempre em STL binário.
    expect(parseMock).toHaveBeenCalledTimes(2)
    expect(parseMock).toHaveBeenCalledWith(expect.anything(), { binary: true })

    // Cada peça é exportada a partir de um clone descartável.
    const clones = cloneSpy.mock.results.map(({ value }) => value as BufferGeometry)
    expect(cloneSpy).toHaveBeenCalledTimes(2)
    expect(disposeSpy).toHaveBeenCalledTimes(2)
    expect(disposeSpy.mock.instances[0]).toBe(clones[0])
    expect(disposeSpy.mock.instances[1]).toBe(clones[1])
    expect(disposeSpy.mock.instances).not.toContain(result.body)
    expect(disposeSpy.mock.instances).not.toContain(result.handle)

    // As geometrias do resultado continuam intactas.
    expect(Array.from(result.body.getAttribute('position').array)).toEqual(Array.from(bodyOriginal))
    expect(Array.from(result.handle!.getAttribute('position').array)).toEqual(
      Array.from(handleOriginal),
    )

    result.body.dispose()
    result.handle!.dispose()
  })

  it('alça desligada gera só o corpo', () => {
    const { anchors, createObjectURL } = setupDownloadMocks()
    parseMock.mockClear()
    const cloneSpy = vi.spyOn(BufferGeometry.prototype, 'clone')
    const result: BuildMugResult = { body: new BoxGeometry(80, 88, 80), handle: null }

    exportMugStl(result, '')

    expect(anchors.map((anchor) => anchor.download)).toEqual(['caneca-corpo.stl'])
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(parseMock).toHaveBeenCalledTimes(1)
    // Só o corpo é preparado para impressão: a preparação da alça também
    // clonaria a peça, então a contagem de clones prova que ela não rodou.
    // (Spies de módulo não interceptam chamadas internas do export.)
    expect(cloneSpy).toHaveBeenCalledTimes(1)
    expect(cloneSpy.mock.instances[0]).toBe(result.body)

    result.body.dispose()
  })

  it('não revoga URL que nunca foi criada e descarta a geometria se o parse falhar', () => {
    const { createObjectURL, revokeObjectURL } = setupDownloadMocks()
    parseMock.mockImplementationOnce(() => {
      throw new Error('parse falhou')
    })
    const disposeSpy = vi.spyOn(BufferGeometry.prototype, 'dispose')
    const result: BuildMugResult = { body: new BoxGeometry(80, 88, 80), handle: null }

    expect(() => exportMugStl(result, 'Falha')).toThrow('parse falhou')
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    // Apenas o clone descartável é liberado; o resultado permanece válido.
    expect(disposeSpy).toHaveBeenCalledTimes(1)
    expect(disposeSpy.mock.instances[0]).not.toBe(result.body)

    result.body.dispose()
  })

  it('revoga a URL e descarta a geometria se o clique falhar', () => {
    const { createObjectURL, revokeObjectURL, removeChildSpy } = setupDownloadMocks({
      clickThrows: true,
    })
    const disposeSpy = vi.spyOn(BufferGeometry.prototype, 'dispose')
    const result: BuildMugResult = { body: new BoxGeometry(80, 88, 80), handle: null }

    expect(() => exportMugStl(result, 'Falha')).toThrow('click falhou')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(removeChildSpy).toHaveBeenCalledTimes(1)
    expect(disposeSpy).toHaveBeenCalledTimes(1)
    expect(disposeSpy.mock.instances[0]).not.toBe(result.body)

    result.body.dispose()
  })
})

describe('preparos de impressão', () => {
  it('prepara o corpo com a base em y = 0, centrado em X e Z, sem mutar o original', () => {
    const body = new BoxGeometry(80, 88, 80)
    body.translate(10, 5, -20)
    const original = positions(body)
    const cloneSpy = vi.spyOn(BufferGeometry.prototype, 'clone')

    const preparedBody = prepareBodyForPrint(body)
    preparedBody.computeBoundingBox()

    expect(cloneSpy).toHaveBeenCalledTimes(1)
    expect(preparedBody).not.toBe(body)
    expect(preparedBody.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(preparedBody.boundingBox!.max.y).toBeCloseTo(88, 3)
    expect(preparedBody.boundingBox!.min.x).toBeCloseTo(-40, 3)
    expect(preparedBody.boundingBox!.max.x).toBeCloseTo(40, 3)
    expect(preparedBody.boundingBox!.min.z).toBeCloseTo(-40, 3)
    expect(preparedBody.boundingBox!.max.z).toBeCloseTo(40, 3)

    // Original não é mutado.
    body.computeBoundingBox()
    expect(body.boundingBox!.min.y).toBeCloseTo(-39, 3)
    expect(Array.from(body.getAttribute('position').array)).toEqual(Array.from(original))

    body.dispose()
    preparedBody.dispose()
  })

  it('a alça real imprime em pé, sem rotação, com a base em y = 0', () => {
    const handle = buildHandle(defaultMugParams)
    const original = positions(handle)
    const loopHeight = defaultMugParams.handleGap + 2 * defaultMugParams.handleBand
    // Maior raio externo da abraçadeira no vão impresso: a interferência é
    // máxima na borda inferior da banda, então o span em Z vem dali.
    const bandBottom = defaultMugParams.handleHeight - defaultMugParams.handleWidth / 2
    const bandTop = defaultMugParams.handleHeight + defaultMugParams.handleWidth / 2
    const bandDiameter =
      2 *
      Math.max(
        getBandOuterRadius(defaultMugParams, bandBottom),
        getBandOuterRadius(defaultMugParams, bandTop),
      )

    const preparedHandle = prepareHandleForPrint(handle)
    preparedHandle.computeBoundingBox()
    const box = preparedHandle.boundingBox!

    // Base na mesa.
    expect(box.min.y).toBeCloseTo(0, 3)
    // Em pé: o vão do laço corre no eixo Y. A espessura extrudada da alça é
    // handleWidth (12 mm), então este span só se mantém sem rotação.
    expect(box.max.y - box.min.y).toBeCloseTo(loopHeight, 3)
    // A abraçadeira de 200° domina o plano XZ com o diâmetro calculado acima;
    // deitada, a peça teria apenas ~handleWidth no eixo Y e outro perfil em Z.
    expect(box.max.z - box.min.z).toBeCloseTo(bandDiameter, 2)
    // Centralizada na mesa em X e Z.
    expect(box.min.x).toBeCloseTo(-box.max.x, 3)
    expect(box.min.z).toBeCloseTo(-box.max.z, 3)

    // Original não é mutado (min Y = handleHeight − loopHeight / 2 = 30,5 mm).
    handle.computeBoundingBox()
    expect(handle.boundingBox!.min.y).toBeCloseTo(
      defaultMugParams.handleHeight - loopHeight / 2,
      3,
    )
    expect(Array.from(handle.getAttribute('position').array)).toEqual(Array.from(original))

    handle.dispose()
    preparedHandle.dispose()
  })
})
