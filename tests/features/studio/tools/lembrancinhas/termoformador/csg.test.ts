import { describe, it, expect } from 'vitest'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { buildTraySupport, buildTrayPlug } from '@/features/studio/tools/lembrancinhas/termoformador/trayParts'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

const cases = [
  { ...defaultThermoformerParams, shape: 'square' as const, width: 120 },
  { ...defaultThermoformerParams, shape: 'pyramid' as const, width: 120 },
]

describe('CSG spike', () => {
  for (const params of cases) {
    it(`fecha suporte e macho ${params.shape}`, () => {
      const outline = getShapeOutline(params)!
      const support = buildTraySupport(params, outline)
      const plug = buildTrayPlug(params, outline)
      expect(isClosed(support)).toBe(true)
      expect(signedVolume(support)).toBeGreaterThan(0)
      expect(isClosed(plug)).toBe(true)
      expect(signedVolume(plug)).toBeGreaterThan(0)
      support.dispose()
      plug.dispose()
    })
  }
})
