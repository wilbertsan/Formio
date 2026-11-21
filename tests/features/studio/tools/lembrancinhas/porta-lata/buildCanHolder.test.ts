import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import {
  buildCanHolder,
  disposeCanHolderResult,
} from '@/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder'
import {
  defaultCanHolderParams,
  getMaxOuterDiameter,
  getOuterHeight,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'
import { rayCrossings, readCpu, realFont } from './canHolderTestUtils'

describe('buildCanHolder', () => {
  it('une o relevo ao corpo e devolve a alça separada', { timeout: 60_000 }, () => {
    // Tempo de CPU da thread, não de parede: a suíte completa roda vários
    // arquivos de geometria em paralelo e a contenção do CI distorce o relógio
    // de parede (e o `cpuUsage` do processo soma threads de fundo do V8).
    const started = readCpu()
    const result = buildCanHolder({ ...defaultCanHolderParams, text: 'Festa' }, realFont())
    const finished = readCpu()
    const elapsedMs =
      (finished.user - started.user + finished.system - started.system) / 1000

    result.body.computeBoundingBox()
    const box = result.body.boundingBox!

    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(getOuterHeight(defaultCanHolderParams), 3)
    expect(box.max.x).toBeCloseTo(getMaxOuterDiameter(defaultCanHolderParams) / 2, 2)
    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(signedVolume(result.body)).toBeGreaterThan(65_000)
    expect(signedVolume(result.body)).toBeLessThan(75_000)
    expect(result.handle).not.toBeNull()
    expect(isClosed(result.handle!)).toBe(true)
    expect(countShells(result.handle!)).toBe(1)
    expect(signedVolume(result.handle!)).toBeGreaterThan(0)
    // Default medido em 1,3–7,3 s de CPU dependendo da carga (primeiro build sem
    // JIT quente no piso da faixa; sob contenção o topo). O gate de 15 s só pega
    // regressões grandes.
    expect(elapsedMs).toBeLessThan(15_000)

    disposeCanHolderResult(result)
  })

  it('o furo de ventilação continua aberto depois da união do relevo', { timeout: 60_000 }, () => {
    const result = buildCanHolder({ ...defaultCanHolderParams, text: 'Festa' }, realFont())
    const volume = signedVolume(result.body)
    const height = getOuterHeight(defaultCanHolderParams)
    const ventR = defaultCanHolderParams.ventHoleDiameter / 2
    const up = new Vector3(0, 1, 0)
    const down = new Vector3(0, -1, 0)

    // O eixo do furo não encontra nenhuma face: nem de baixo para cima (fundo
    // anular) nem de cima para baixo (cavidade + furo).
    expect(rayCrossings(result.body, new Vector3(0, -10, 0), up)).toBe(0)
    expect(rayCrossings(result.body, new Vector3(0, height + 10, 0), down)).toBe(0)
    // A 0,5 mm da borda nominal, ainda dentro do furo, nenhum raio encontra
    // face (dos dois lados do eixo)...
    for (const x of [-(ventR - 0.5), ventR - 0.5]) {
      expect(rayCrossings(result.body, new Vector3(x, -10, 0), up)).toBe(0)
      expect(rayCrossings(result.body, new Vector3(x, height + 10, 0), down)).toBe(0)
    }
    // ...e 0,5 mm fora dele o fundo anular barra o raio: fixa o diâmetro real
    // em 10 ± 1 mm, não apenas o ponto do perfil.
    expect(
      rayCrossings(result.body, new Vector3(ventR + 0.5, -10, 0), up),
    ).toBeGreaterThan(0)
    // Volume do corpo sólido (≈69.987 mm³) mais o relevo visível; o furo
    // continua descontado da cavidade.
    expect(volume).toBeGreaterThan(65_000)
    expect(volume).toBeLessThan(75_000)
    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)

    disposeCanHolderResult(result)
  })

  it('a união do relevo adiciona material ao corpo', { timeout: 60_000 }, () => {
    const withText = buildCanHolder({ ...defaultCanHolderParams, text: 'Festa' }, realFont())
    const withoutText = buildCanHolder({ ...defaultCanHolderParams, text: '' }, realFont())
    const reliefVolume = signedVolume(withText.body) - signedVolume(withoutText.body)

    // Relevo visível de 1 mm sobre a parede: o delta fica na ordem da área do
    // texto. Uma faixa estreita pega tanto subtração quanto relevo quase raso.
    expect(reliefVolume).toBeGreaterThanOrEqual(80)
    expect(reliefVolume).toBeLessThanOrEqual(300)

    disposeCanHolderResult(withText)
    disposeCanHolderResult(withoutText)
  })

  it('sem texto devolve só o corpo de revolução com o furo', { timeout: 60_000 }, () => {
    const result = buildCanHolder({ ...defaultCanHolderParams, text: '' }, realFont())
    const height = getOuterHeight(defaultCanHolderParams)

    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(signedVolume(result.body)).toBeGreaterThan(65_000)
    expect(signedVolume(result.body)).toBeLessThan(75_000)
    expect(
      rayCrossings(result.body, new Vector3(0, -10, 0), new Vector3(0, 1, 0)),
    ).toBe(0)
    expect(
      rayCrossings(result.body, new Vector3(0, height + 10, 0), new Vector3(0, -1, 0)),
    ).toBe(0)
    expect(result.handle).not.toBeNull()
    disposeCanHolderResult(result)
  })

  it('alça desligada devolve handle nulo', { timeout: 60_000 }, () => {
    const result = buildCanHolder({ ...defaultCanHolderParams, handleEnabled: false }, realFont())
    expect(result.handle).toBeNull()
    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    disposeCanHolderResult(result)
  })
})
