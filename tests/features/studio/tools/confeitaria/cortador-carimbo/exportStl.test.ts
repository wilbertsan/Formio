import { describe, it, expect, vi } from 'vitest'
import { exportCutterStampStl } from '@/features/studio/tools/confeitaria/cortador-carimbo/exportStl'
import type { BuildCutterStampResult } from '@/features/studio/tools/confeitaria/cortador-carimbo/buildCutterStamp'

vi.mock('three', () => ({
  Mesh: vi.fn().mockImplementation(() => ({})),
  Scene: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    traverse: vi.fn(),
  })),
}))

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: vi.fn((geos) => {
    if (geos.length === 0) return null
    return { attributes: { position: {} }, computeBoundingBox: vi.fn() }
  }),
}))

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

function makeGeometry(): BuildCutterStampResult {
  return {
    cutter: { dispose: vi.fn() },
    stampBase: { dispose: vi.fn() },
    stampRelief: { dispose: vi.fn() },
  } as unknown as BuildCutterStampResult
}

describe('exportCutterStampStl', () => {
  it('gera download com blob e nome sanitizado', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, writable: true })
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true })

    const clickSpy = vi.fn()
    const appendChildSpy = vi.fn()
    const removeChildSpy = vi.fn()
    const anchorStub = { click: clickSpy, href: '', download: '' }
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorStub as never)
    const appendChildOrig = document.body.appendChild.bind(document.body)
    const removeChildOrig = document.body.removeChild.bind(document.body)
    Object.defineProperty(document.body, 'appendChild', { value: appendChildSpy, writable: true })
    Object.defineProperty(document.body, 'removeChild', { value: removeChildSpy, writable: true })

    exportCutterStampStl(makeGeometry(), 'Meu Cortador! @#')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(anchorStub.download).toBe('Meu_Cortador____.stl')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    createElementSpy.mockRestore()
    Object.defineProperty(document.body, 'appendChild', { value: appendChildOrig, writable: true })
    Object.defineProperty(document.body, 'removeChild', { value: removeChildOrig, writable: true })
  })

  it('mescla as três peças', () => {
    vi.mocked(mergeGeometries).mockClear()
    exportCutterStampStl(makeGeometry(), 'Projeto')
    expect(vi.mocked(mergeGeometries).mock.calls[0]![0]).toHaveLength(3)
  })
})
