import type { BuildCutterStampResult } from './buildCutterStamp'
import {
  deserializeGeometry,
  serializeGeometry,
  type SerializedGeometry,
} from '../shared/workerGeometry'

export { deserializeGeometry, serializeGeometry }
export type { SerializedGeometry }

export interface SerializedBuildResult {
  cutter: SerializedGeometry
  stampBase: SerializedGeometry
  stampRelief: SerializedGeometry
}

export function serializeBuildResult(result: BuildCutterStampResult): { data: SerializedBuildResult; transfer: ArrayBuffer[] } {
  const pieces: BuildCutterStampResult = {
    cutter: result.cutter,
    stampBase: result.stampBase,
    stampRelief: result.stampRelief,
  }

  const data = {} as SerializedBuildResult
  const transfer: ArrayBuffer[] = []

  for (const key of Object.keys(pieces) as (keyof SerializedBuildResult)[]) {
    const serialized = serializeGeometry(pieces[key])
    data[key] = serialized.data
    transfer.push(...serialized.transfer)
  }

  return { data, transfer }
}

export function deserializeBuildResult(data: SerializedBuildResult): BuildCutterStampResult {
  return {
    cutter: deserializeGeometry(data.cutter),
    stampBase: deserializeGeometry(data.stampBase),
    stampRelief: deserializeGeometry(data.stampRelief),
  }
}
