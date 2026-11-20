import { describe, it, expect } from 'vitest'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { getSvgScreenPoints, inspectSvgSilhouette } from '@/features/studio/tools/lembrancinhas/termoformador/svgOutline'

const triangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,5 95,95 5,95" fill="#000"/>
</svg>`

const donut = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M50 5A45 45 0 1 0 50 95A45 45 0 1 0 50 5Z M50 25A25 25 0 1 1 50 75A25 25 0 1 1 50 25Z" fill="#000"/>
</svg>`

describe('svgOutline', () => {
  it('escala pela maior dimensão e centraliza', () => {
    const parsed = parseSvg(triangle)!
    const points = getSvgScreenPoints(parsed, 100)!
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(100, 0)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(100, 0)
  })

  it('rejeita furo', () => {
    const parsed = parseSvg(donut)!
    const result = inspectSvgSilhouette(parsed, 100)
    expect(result.points).toBeNull()
    expect(result.error).toBe('contour')
  })
})
