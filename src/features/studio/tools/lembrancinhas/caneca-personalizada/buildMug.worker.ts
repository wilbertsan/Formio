import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'
import { buildMug, disposeMugResult, type BuildMugResult } from './buildMug'
import {
  serializeBuildResult,
  type MugErrorCode,
  type MugWorkerResponse,
} from './workerGeometry'
import {
  mugGeometryParamsSchema,
  type FontStyle,
  type MugGeometryParams,
} from './schema'

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  postMessage: (message: MugWorkerResponse, transfer?: Transferable[]) => void
}

function readRequestId(value: unknown): number {
  if (typeof value !== 'object' || value === null) return 0
  const id = (value as { id?: unknown }).id
  return typeof id === 'number' ? id : 0
}

function readParams(value: unknown): MugGeometryParams {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Requisição inválida')
  }
  const params = (value as { params?: unknown }).params
  const parsed = mugGeometryParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw new Error('Parâmetros inválidos')
  }
  return parsed.data
}

function loadFont(style: FontStyle): Promise<Font> {
  return new Promise((resolve, reject) => {
    new FontLoader().load(fontUrls[style], resolve, undefined, reject)
  })
}

/** O detalhe fica no console; a UI só recebe o código da falha. */
function fail(id: number, code: MugErrorCode, error: unknown): void {
  console.error(error)
  scope.postMessage({ id, error: code })
}

scope.onmessage = async (event) => {
  let id = 0
  let params: MugGeometryParams
  try {
    const message: unknown = event.data
    id = readRequestId(message)
    params = readParams(message)
  } catch (error) {
    fail(id, 'mug-invalid', error)
    return
  }

  let font: Font
  try {
    font = await loadFont(params.fontStyle)
  } catch (error) {
    fail(id, 'mug-font', error)
    return
  }

  let result: BuildMugResult
  try {
    result = buildMug(params, font)
  } catch (error) {
    fail(id, 'mug-csg', error)
    return
  }

  try {
    const { data, transfer } = serializeBuildResult(result)
    scope.postMessage({ id, data }, transfer)
  } catch (error) {
    // A serialização falhou antes do transfer: a geometria ainda é nossa.
    disposeMugResult(result)
    fail(id, 'mug-build', error)
  }
}
