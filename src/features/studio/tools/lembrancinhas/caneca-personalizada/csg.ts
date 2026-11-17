import { Evaluator } from 'three-bvh-csg'

/**
 * `useCDTClipping` existe no runtime do three-bvh-csg, mas falta no
 * `index.d.ts` do pacote. O splitter CDT gera cortes conformes entre as duas
 * peças; o splitter legado deixa T-junctions nas bordas curvas (alça) e na
 * união do relevo com o corpo.
 */
export type ConformingEvaluator = Evaluator & { useCDTClipping: boolean }

export function createConformingEvaluator(): ConformingEvaluator {
  const evaluator = new Evaluator() as ConformingEvaluator
  evaluator.useCDTClipping = true
  if (!evaluator.useCDTClipping) {
    throw new Error(
      'three-bvh-csg sem useCDTClipping; o splitter legado deixa a malha aberta.',
    )
  }
  return evaluator
}
