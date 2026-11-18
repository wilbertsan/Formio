import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultCanHolderParams } from '@/features/studio/tools/lembrancinhas/porta-lata/schema'

const { loadMock, buildMock, disposeMock, serializeMock } = vi.hoisted(() => ({
  loadMock: vi.fn(),
  buildMock: vi.fn(),
  disposeMock: vi.fn(),
  serializeMock: vi.fn(),
}))

vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: class {
    load = loadMock
  },
}))

vi.mock('@/features/studio/tools/chaveiros/chaveiro/fonts', () => ({
  fontUrls: {
    normal: '/mock/helvetiker.json',
    bold: '/mock/helvetiker-bold.json',
    serif: '/mock/optimer.json',
  },
}))

vi.mock('@/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder', () => ({
  buildCanHolder: buildMock,
  disposeCanHolderResult: disposeMock,
}))

vi.mock('@/features/studio/tools/lembrancinhas/porta-lata/workerGeometry', () => ({
  serializeBuildResult: serializeMock,
}))

interface WorkerScope {
  onmessage: ((event: MessageEvent<unknown>) => void | Promise<void>) | null
  postMessage: ReturnType<typeof vi.fn>
}

const scope: WorkerScope = {
  onmessage: null,
  postMessage: vi.fn(),
}

beforeAll(async () => {
  vi.stubGlobal('self', scope)
  await import('@/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.worker')
})

afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.clearAllMocks()
  loadMock.mockImplementation((_url: string, onLoad: (font: unknown) => void) => {
    onLoad({ familyName: 'mock' })
  })
  buildMock.mockReturnValue({ body: { name: 'body' }, handle: null })
  serializeMock.mockReturnValue({
    data: { body: { position: new Float32Array(), normal: new Float32Array(), index: null }, handle: null },
    transfer: [],
  })
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function dispatch(payload: unknown): Promise<void> {
  expect(scope.onmessage).not.toBeNull()
  await scope.onmessage?.({ data: payload } as MessageEvent<unknown>)
}

describe('buildCanHolder.worker', () => {
  it('reporta can-invalid para parâmetros fora do schema', async () => {
    await dispatch({
      id: 1,
      params: { ...defaultCanHolderParams, cavityDepth: 200 },
    })

    expect(scope.postMessage).toHaveBeenCalledWith({ id: 1, error: 'can-invalid' })
    expect(loadMock).not.toHaveBeenCalled()
    expect(buildMock).not.toHaveBeenCalled()
  })

  it('reporta can-font quando a fonte não carrega', async () => {
    loadMock.mockImplementation(
      (_url: string, _onLoad: unknown, _onProgress: unknown, onError: (error: unknown) => void) => {
        onError(new Error('font'))
      },
    )

    await dispatch({ id: 2, params: defaultCanHolderParams })

    expect(scope.postMessage).toHaveBeenCalledWith({ id: 2, error: 'can-font' })
    expect(buildMock).not.toHaveBeenCalled()
  })

  it('reporta can-csg quando o build lança', async () => {
    buildMock.mockImplementation(() => {
      throw new Error('csg')
    })

    await dispatch({ id: 3, params: defaultCanHolderParams })

    expect(scope.postMessage).toHaveBeenCalledWith({ id: 3, error: 'can-csg' })
    expect(serializeMock).not.toHaveBeenCalled()
  })

  it('reporta can-build e descarta a geometria quando a serialização lança', async () => {
    const result = { body: { name: 'body' }, handle: null }
    buildMock.mockReturnValue(result)
    serializeMock.mockImplementation(() => {
      throw new Error('serialize')
    })

    await dispatch({ id: 4, params: defaultCanHolderParams })

    expect(disposeMock).toHaveBeenCalledWith(result)
    expect(scope.postMessage).toHaveBeenCalledWith({ id: 4, error: 'can-build' })
  })

  it('publica o resultado serializado com o id do build', async () => {
    const data = {
      body: { position: new Float32Array([0, 0, 0]), normal: new Float32Array([0, 0, 1]), index: null },
      handle: null,
    }
    serializeMock.mockReturnValue({ data, transfer: [] })

    await dispatch({ id: 5, params: defaultCanHolderParams })

    expect(scope.postMessage).toHaveBeenCalledWith({ id: 5, data }, [])
  })
})
