import { describe, it, expect } from 'vitest'
import { Evaluator } from 'three-bvh-csg'
import { createConformingEvaluator } from '@/features/studio/tools/lembrancinhas/porta-lata/csg'

describe('createConformingEvaluator', () => {
  it('ativa o splitter CDT do runtime', () => {
    expect(Reflect.has(Evaluator.prototype, 'useCDTClipping')).toBe(true)

    const evaluator = createConformingEvaluator()
    expect(evaluator.useCDTClipping).toBe(true)
    // O acesso deve passar pelo accessor do protótipo, sem criar uma
    // propriedade própria que mascararia o setter do runtime.
    expect(
      Object.prototype.hasOwnProperty.call(evaluator, 'useCDTClipping'),
    ).toBe(false)
  })
})
