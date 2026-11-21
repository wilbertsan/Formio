import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseSvg, type ParsedSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { createScreenWorker } from '@/features/studio/tools/lembrancinhas/termoformador/workerClient'
import {
  defaultThermoformerParams,
  type ThermoformerGeometryParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import type { SerializedThermoformerResult } from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'

const triangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,5 95,95 5,95" fill="#000"/>
</svg>`

const params: ThermoformerGeometryParams = defaultThermoformerParams

const geometry = {
  position: new Float32Array([0, 0, 0]),
  normal: new Float32Array([0, 0, 1]),
  index: null,
}

const data: SerializedThermoformerResult = {
  screen: geometry,
  support: geometry,
  plug: geometry,
  seatY: 24,
}

type WorkerResponse =
  | { data: SerializedThermoformerResult }
  | { error: string }

interface BuildMessage {
  params: ThermoformerGeometryParams
  parsedSvg: ParsedSvg | null
}

class FakeWorker {
  static instances: FakeWorker[] = []

  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null
  onerror: (() => void) | null = null
  onmessageerror: (() => void) | null = null

  readonly posted: BuildMessage[] = []
  terminated = false

  constructor(
    readonly url: URL,
    readonly options?: WorkerOptions,
  ) {
    FakeWorker.instances.push(this)
  }

  postMessage(message: BuildMessage): void {
    this.posted.push(message)
  }

  terminate(): void {
    this.terminated = true
  }

  respond(response: WorkerResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<WorkerResponse>)
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

function setup(): { worker: ReturnType<typeof createScreenWorker>; fake: FakeWorker } {
  const worker = createScreenWorker()
  const fake = FakeWorker.instances.at(-1)!
  return { worker, fake }
}

describe('workerClient', () => {
  it('envia os parâmetros e o parsedSvg nulo', () => {
    const { worker, fake } = setup()

    worker.build(params, null, vi.fn())

    expect(fake.posted).toHaveLength(1)
    expect(fake.posted[0]).toEqual({ params, parsedSvg: null })
  })

  it('envia o parsedSvg quando presente', () => {
    const { worker, fake } = setup()
    const parsedSvg = parseSvg(triangle)!

    worker.build(params, parsedSvg, vi.fn())

    expect(fake.posted[0]).toEqual({ params, parsedSvg })
  })

  it('entrega o resultado do worker', () => {
    const { worker, fake } = setup()
    const onResult = vi.fn()

    worker.build(params, null, onResult)
    fake.respond({ data })

    expect(onResult).toHaveBeenCalledWith(data)
  })

  it('encaminha o motivo do erro do worker', () => {
    const { worker, fake } = setup()
    const onResult = vi.fn()
    const onError = vi.fn()

    worker.build(params, null, onResult, onError)
    fake.respond({ error: 'invalid-outline' })

    expect(onError).toHaveBeenCalledWith('invalid-outline')
    expect(onResult).not.toHaveBeenCalled()
  })

  it('trata erro e erro de mensagem do worker sem motivo', () => {
    const { worker, fake } = setup()
    const onError = vi.fn()

    worker.build(params, null, vi.fn(), onError)
    fake.onerror?.()
    fake.onmessageerror?.()

    expect(onError.mock.calls).toEqual([[], []])
  })

  it('não aceita builds depois de terminate', () => {
    const { worker, fake } = setup()
    const onError = vi.fn()

    worker.build(params, null, vi.fn())
    worker.terminate()
    worker.build(params, null, vi.fn(), onError)

    expect(fake.terminated).toBe(true)
    expect(fake.posted).toHaveLength(1)
    expect(onError).toHaveBeenCalledWith('terminated')
  })
})
