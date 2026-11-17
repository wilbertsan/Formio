import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'
import { buildMug } from './buildMug'
import { serializeBuildResult, type MugWorkerResponse } from './workerGeometry'
import { PRODUCT_TYPE, type FontStyle, type MugGeometryParams } from './schema'

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
  if (
    typeof params !== 'object' ||
    params === null ||
    (params as { productType?: unknown }).productType !== PRODUCT_TYPE
  ) {
    throw new Error('Parâmetros inválidos')
  }
  return params as MugGeometryParams
}

function loadFont(style: FontStyle): Promise<Font> {
  return new Promise((resolve, reject) => {
    new FontLoader().load(fontUrls[style], resolve, undefined, reject)
  })
}

scope.onmessage = async (event) => {
  let id = 0
  try {
    const message: unknown = event.data
    id = readRequestId(message)
    const params = readParams(message)
    const font = await loadFont(params.fontStyle)
    const { data, transfer } = serializeBuildResult(buildMug(params, font))
    scope.postMessage({ id, data }, transfer)
  } catch (error) {
    console.error(error)
    scope.postMessage({
      id,
      error: error instanceof Error ? error.message : 'Falha ao gerar a geometria',
    })
  }
}
