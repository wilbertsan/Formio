import * as THREE from 'three'
import type { MockInstance } from 'vitest'
import { exportStl } from '@/features/studio/tools/letreiros/cartao-visita/exportStl'
import type { BuildCardResult } from '@/features/studio/tools/letreiros/cartao-visita/buildCard'

interface DownloadHarness {
  createObjectURL: ReturnType<typeof vi.fn>
  revokeObjectURL: ReturnType<typeof vi.fn>
  anchor: { click: ReturnType<typeof vi.fn>; href: string; download: string }
}

let urlDescriptors: {
  createObjectURL?: PropertyDescriptor
  revokeObjectURL?: PropertyDescriptor
} = {}
let bodyDescriptors: {
  appendChild?: PropertyDescriptor
  removeChild?: PropertyDescriptor
} = {}
let createElementSpy: MockInstance | null = null

function setupDownloadHarness(): DownloadHarness {
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()
  urlDescriptors = {
    createObjectURL: Object.getOwnPropertyDescriptor(window.URL, 'createObjectURL'),
    revokeObjectURL: Object.getOwnPropertyDescriptor(window.URL, 'revokeObjectURL'),
  }
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

  const click = vi.fn()
  const anchor = { click, href: '', download: '' }
  createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor as never)
  bodyDescriptors = {
    appendChild: Object.getOwnPropertyDescriptor(document.body, 'appendChild'),
    removeChild: Object.getOwnPropertyDescriptor(document.body, 'removeChild'),
  }
  Object.defineProperty(document.body, 'appendChild', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })
  Object.defineProperty(document.body, 'removeChild', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })

  return { createObjectURL, revokeObjectURL, anchor }
}

function restoreProperty(
  target: object,
  name: string,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) Object.defineProperty(target, name, descriptor)
  else delete (target as Record<string, unknown>)[name]
}

afterEach(() => {
  createElementSpy?.mockRestore()
  createElementSpy = null
  restoreProperty(document.body, 'appendChild', bodyDescriptors.appendChild)
  restoreProperty(document.body, 'removeChild', bodyDescriptors.removeChild)
  bodyDescriptors = {}
  restoreProperty(window.URL, 'createObjectURL', urlDescriptors.createObjectURL)
  restoreProperty(window.URL, 'revokeObjectURL', urlDescriptors.revokeObjectURL)
  urlDescriptors = {}
})

it('mescla de verdade base + conteúdo e exporta todos os triângulos', async () => {
  const harness = setupDownloadHarness()
  const build: BuildCardResult = {
    base: new THREE.BoxGeometry(85, 55, 2),
    content: new THREE.BoxGeometry(10, 4, 1),
    contentItems: [],
  }

  exportStl(build, 'Real')

  const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
  const view = new DataView(buffer)
  // STL binário: 80 bytes de header + uint32 com a contagem de triângulos.
  const triangles = view.getUint32(80, true)
  expect(triangles).toBe(24)
  expect(harness.anchor.download).toBe('Real.stl')
})
