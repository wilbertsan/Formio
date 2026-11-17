import { describe, it, expect, vi, afterEach } from 'vitest'
import { exportMugStl } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/exportStl'
import { buildHandle } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'

const originalCreateObjectURL = Object.getOwnPropertyDescriptor(window.URL, 'createObjectURL')
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(window.URL, 'revokeObjectURL')

type Anchor = {
  click: ReturnType<typeof vi.fn>
  href: string
  download: string
}

function setupDownloadMocks() {
  const blobs: Blob[] = []
  const createObjectURL = vi.fn((blob: Blob): string => {
    blobs.push(blob)
    return `blob:mock-${blobs.length}`
  })
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
  vi.spyOn(document, 'createElement').mockImplementation(() => {
    const anchor = { click: vi.fn(), href: '', download: '' }
    anchors.push(anchor)
    return anchor as never
  })
  vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as never)
  vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as never)

  return { anchors, blobs, createObjectURL, revokeObjectURL }
}

function triangleCount(geometry: ReturnType<typeof buildHandle>): number {
  const index = geometry.getIndex()
  return index ? index.count / 3 : geometry.getAttribute('position').count / 3
}

/**
 * O Blob do jsdom não implementa `arrayBuffer()`; o FileReader é o caminho
 * equivalente no ambiente de teste.
 */
function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
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

afterEach(() => {
  vi.restoreAllMocks()
  restoreUrlDescriptors()
})

describe('exportMugStl com o exportador real', () => {
  it('serializa o STL binário com cabeçalho, contagem e 50 bytes por triângulo', async () => {
    const { anchors, blobs, createObjectURL, revokeObjectURL } = setupDownloadMocks()
    // A alça real exercita o exportador de verdade, sem mock de parse; o slot
    // do corpo é apenas o transporte da peça única deste cenário.
    const handle = buildHandle(defaultMugParams)
    const triangles = triangleCount(handle)
    expect(triangles).toBeGreaterThan(0)

    exportMugStl({ body: handle, handle: null }, 'Binario')

    expect(anchors).toHaveLength(1)
    expect(anchors[0].download).toBe('Binario-corpo.stl')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(blobs).toHaveLength(1)

    const [blob] = blobs
    expect(blob.type).toBe('model/stl')

    const buffer = await readBlob(blob)
    const view = new DataView(buffer)
    // Layout binário do STL: 80 bytes de cabeçalho, uint32 com o número de
    // triângulos e 50 bytes por triângulo (normal + 3 vértices + atributo).
    expect(buffer.byteLength).toBe(84 + 50 * triangles)
    expect(view.getUint32(80, true)).toBe(triangles)

    handle.dispose()
  })
})
