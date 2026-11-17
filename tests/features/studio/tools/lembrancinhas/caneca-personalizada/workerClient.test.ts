import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMugWorker } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/workerClient'
import { defaultMugParams, type MugGeometryParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import type {
  MugWorkerResponse,
  SerializedBuildResult,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/workerGeometry'

const params: MugGeometryParams = defaultMugParams

const data: SerializedBuildResult = {
  body: {
    position: new Float32Array([0, 0, 0]),
    normal: new Float32Array([0, 0, 1]),
    index: null,
  },
  handle: null,
}

class FakeWorker {
  static instances: FakeWorker[] = []

  onmessage: ((event: MessageEvent<MugWorkerResponse>) => void) | null = null
  onerror: (() => void) | null = null
  onmessageerror: (() => void) | null = null

  readonly posted: Array<{ id: number; params: MugGeometryParams }> = []
  terminated = false

  constructor(
    readonly url: URL,
    readonly options?: WorkerOptions,
  ) {
    FakeWorker.instances.push(this)
  }

  postMessage(message: { id: number; params: MugGeometryParams }): void {
    this.posted.push(message)
  }

  terminate(): void {
    this.terminated = true
  }

  respond(response: MugWorkerResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<MugWorkerResponse>)
  }
}

const originalWorker = globalThis.Worker

beforeEach(() => {
  FakeWorker.instances = []
  globalThis.Worker = FakeWorker as unknown as typeof Worker
})

afterEach(() => {
  globalThis.Worker = originalWorker
  vi.restoreAllMocks()
})

function setup(): { worker: ReturnType<typeof createMugWorker>; fake: FakeWorker } {
  const worker = createMugWorker()
  const fake = FakeWorker.instances.at(-1)!
  return { worker, fake }
}

describe('workerClient', () => {
  it('envia o build com id monotônico e parâmetros', () => {
    const { worker, fake } = setup()

    worker.build(params, vi.fn())
    worker.build(params, vi.fn())

    expect(fake.posted).toHaveLength(2)
    expect(fake.posted[0].id).toBe(1)
    expect(fake.posted[1].id).toBe(2)
    expect(fake.posted[0].params).toBe(params)
  })

  it('ignora resposta atrasada de um build anterior', () => {
    const { worker, fake } = setup()
    const onResult = vi.fn()

    worker.build(params, onResult)
    worker.build(params, onResult)

    fake.respond({ id: 1, data })
    expect(onResult).not.toHaveBeenCalled()

    fake.respond({ id: 2, data })
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith(data)
  })

  it('entrega a resposta do build atual', () => {
    const { worker, fake } = setup()
    const onResult = vi.fn()

    worker.build(params, onResult)
    fake.respond({ id: 1, data })

    expect(onResult).toHaveBeenCalledWith(data)
  })

  it('encaminha a mensagem de erro do worker', () => {
    const { worker, fake } = setup()
    const onError = vi.fn()

    worker.build(params, vi.fn(), onError)
    fake.respond({ id: 1, error: 'mug-csg' })

    expect(onError).toHaveBeenCalledWith('mug-csg')
  })

  it('trata erro e erro de mensagem do worker', () => {
    const { worker, fake } = setup()
    const onError = vi.fn()

    worker.build(params, vi.fn(), onError)
    fake.onerror?.()
    fake.onmessageerror?.()

    expect(onError).toHaveBeenCalledTimes(2)
  })

  it('não aceita builds depois de terminate', () => {
    const { worker, fake } = setup()
    const onError = vi.fn()

    worker.build(params, vi.fn())
    worker.terminate()
    worker.build(params, vi.fn(), onError)

    expect(fake.terminated).toBe(true)
    expect(fake.posted).toHaveLength(1)
    expect(onError).toHaveBeenCalledTimes(1)
  })
})
