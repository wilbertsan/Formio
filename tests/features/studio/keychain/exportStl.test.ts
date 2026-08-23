import * as THREE from 'three'
import { exportStl } from '@/features/studio/keychain/exportStl'

describe('exportStl', () => {
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

    const geometry = new THREE.BoxGeometry(10, 10, 10)
    exportStl(geometry, 'Meu Projeto! @#')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(anchorStub.download).toBe('Meu-Projeto.stl')
    expect(anchorStub.href).toBe('blob:mock-url')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    createElementSpy.mockRestore()
    Object.defineProperty(document.body, 'appendChild', { value: appendChildOrig, writable: true })
    Object.defineProperty(document.body, 'removeChild', { value: removeChildOrig, writable: true })
  })
})
