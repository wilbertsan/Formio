import * as THREE from 'three'
import {
  clampOffset,
  fitGeometryToRegion,
  getUsableRegion,
  resolveContentGeometry,
} from '@/features/studio/tools/letreiros/suporte-foto/autoFit'
import {
  defaultPhotoStandParams,
  type PhotoStandContent,
} from '@/features/studio/tools/letreiros/suporte-foto/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

const SVG_RECT =
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#000"/></svg>'

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor(_text?: string, parameters?: { size: number; depth: number }) {
      super()
      if (!parameters) return
      const w = parameters.size * 4
      const h = parameters.size
      const d = parameters.depth
      this.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0,
           -w / 2, -h / 2, d, w / 2, -h / 2, d, w / 2, h / 2, d, -w / 2, h / 2, d],
          3,
        ),
      )
      this.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 7, 4, 0, 3, 7, 1, 5, 6, 1, 6, 2])
    }
  },
}))

const fontStub = { glyphs: {} } as never

const TEXT_ITEM: PhotoStandContent = {
  id: 'content-1',
  kind: 'text',
  content: 'Nome',
  fontStyle: 'bold',
  fontSize: 8,
  offsetX: 0,
  offsetY: 0,
}

function geometryBounds(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  return {
    width: bb.max.x - bb.min.x,
    height: bb.max.y - bb.min.y,
    minZ: bb.min.z,
    centerX: (bb.min.x + bb.max.x) / 2,
    centerY: (bb.min.y + bb.max.y) / 2,
  }
}

describe('suporte-foto autoFit', () => {
  it('define a área útil recuada pela margem da faixa', () => {
    expect(getUsableRegion(defaultPhotoStandParams)).toEqual({
      kind: 'rect',
      minX: -57,
      maxX: 57,
      minY: -9.5,
      maxY: 9.5,
    })
  })

  it('acompanha a largura da foto e a altura da faixa', () => {
    const region = getUsableRegion({
      ...defaultPhotoStandParams,
      photoSize: '15x20',
      sideMargin: 5,
      bandHeight: 40,
    })
    expect(region.maxX).toBeCloseTo(77, 5)
    expect(region.maxY).toBeCloseTo(17, 5)
  })

  it('reduz apenas quando necessário e centraliza', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    const geometry = new THREE.BoxGeometry(200, 10, 1)
    fitGeometryToRegion(geometry, region)
    const result = geometryBounds(geometry)
    expect(result.width).toBeCloseTo(114, 1)
    expect(result.height).toBeCloseTo(5.7, 1)
    expect(result.centerX).toBeCloseTo(0, 5)
    expect(result.centerY).toBeCloseTo(0, 5)
    expect(result.minZ).toBeCloseTo(0, 5)
  })

  it('nunca amplia a geometria', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    const geometry = new THREE.BoxGeometry(10, 4, 1)
    fitGeometryToRegion(geometry, region)
    const result = geometryBounds(geometry)
    expect(result.width).toBeCloseTo(10, 5)
    expect(result.height).toBeCloseTo(4, 5)
  })

  it('clampa o offset dentro da área útil', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    const clamped = clampOffset(region, 8, 4, { x: 100, y: -100 })
    expect(clamped.x).toBeCloseTo(49, 5)
    expect(clamped.y).toBeCloseTo(-5.5, 5)
  })

  it('resolve texto com auto-fit e offset', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    const fitted = resolveContentGeometry(
      { ...TEXT_ITEM, offsetX: 10 },
      { region, font: fontStub },
    )
    expect(fitted).not.toBeNull()
    expect(fitted!.halfWidth).toBeCloseTo(16, 1)
    expect(fitted!.halfHeight).toBeCloseTo(4, 1)
    expect(fitted!.x).toBeCloseTo(10, 5)
    expect(fitted!.y).toBeCloseTo(0, 5)
  })

  it('encolhe texto maior que a faixa', () => {
    const region = getUsableRegion({ ...defaultPhotoStandParams, bandHeight: 15 })
    const fitted = resolveContentGeometry(
      { ...TEXT_ITEM, fontSize: 15 },
      { region, font: fontStub },
    )
    expect(fitted).not.toBeNull()
    expect(fitted!.geometry.boundingBox!.max.y - fitted!.geometry.boundingBox!.min.y)
      .toBeCloseTo(9, 1)
  })

  it('retorna null para texto vazio ou sem fonte', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    expect(resolveContentGeometry({ ...TEXT_ITEM, content: '' }, { region, font: fontStub })).toBeNull()
    expect(resolveContentGeometry(TEXT_ITEM, { region })).toBeNull()
  })

  it('resolve ícone SVG dentro da caixa', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    const iconItem: PhotoStandContent = {
      id: 'icon-1',
      kind: 'icon',
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconLineWidth: 0.3,
      offsetX: 0,
      offsetY: 0,
    }
    const parsed = parseSvg(SVG_RECT)
    const fitted = resolveContentGeometry(iconItem, { region }, parsed)
    expect(fitted).not.toBeNull()
    expect(fitted!.halfWidth).toBeGreaterThan(0)
    expect(fitted!.halfHeight).toBeGreaterThan(0)
    const bb = fitted!.geometry.boundingBox!
    expect(bb.max.z - bb.min.z).toBeCloseTo(1, 2)
  })
})
