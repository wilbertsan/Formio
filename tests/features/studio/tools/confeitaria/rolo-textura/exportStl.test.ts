import { describe, it, expect, vi } from 'vitest'
import { exportTextureRollerStl } from '@/features/studio/tools/confeitaria/rolo-textura/exportStl'
import type { BuildTextureRollerResult } from '@/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller'

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class {
    parse = vi.fn(() => new ArrayBuffer(84))
  },
}))

function makeResult(): BuildTextureRollerResult {
  return { roller: { dispose: vi.fn() } } as unknown as BuildTextureRollerResult
}

describe('exportTextureRollerStl', () => {
  it('gera download com blob e nome sanitizado', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, writable: true })
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true })

    const clickSpy = vi.fn()
    const anchorStub = { click: clickSpy, href: '', download: '' }
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorStub as never)
    const appendChildSpy = vi.fn()
    const removeChildSpy = vi.fn()
    Object.defineProperty(document.body, 'appendChild', { value: appendChildSpy, writable: true })
    Object.defineProperty(document.body, 'removeChild', { value: removeChildSpy, writable: true })

    exportTextureRollerStl(makeResult(), 'Meu Rolo! @#')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(anchorStub.download).toBe('Meu_Rolo____.stl')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(appendChildSpy).toHaveBeenCalledTimes(1)
    expect(removeChildSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    createElementSpy.mockRestore()
  })
})
