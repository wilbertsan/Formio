import type { BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buildBody } from './buildBody'
import { buildRelief } from './buildRelief'
import type { ParsedSvg } from '../shared/svgToIconShape'
import type { TextureRollerParams } from './schema'

export interface BuildTextureRollerInput {
  params: TextureRollerParams
  parsedSvg?: ParsedSvg | null
}

export interface BuildTextureRollerResult {
  roller: BufferGeometry
}

export function buildTextureRoller({ params, parsedSvg }: BuildTextureRollerInput): BuildTextureRollerResult {
  const body = buildBody(params)
  const relief = buildRelief(params, parsedSvg)

  if (!relief) {
    body.addGroup(0, body.index!.count, 0)
    body.addGroup(body.index!.count, 0, 1)
    return { roller: body }
  }

  const merged = mergeGeometries([body, relief], true)
  if (!merged) {
    relief.dispose()
    body.addGroup(0, body.index!.count, 0)
    body.addGroup(body.index!.count, 0, 1)
    return { roller: body }
  }

  body.dispose()
  relief.dispose()
  return { roller: merged }
}
