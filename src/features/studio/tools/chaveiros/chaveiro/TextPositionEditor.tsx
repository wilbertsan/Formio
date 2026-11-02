import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { Button, Flex, Heading } from '@aws-amplify/ui-react'
import { Shape, Vector2 } from 'three'
import { clampOffset, getUsableRegion } from './autoFit'
import { clampTextPosition, type BoundingBox2D } from './positioning'
import {
  createBaseShape,
  getClampedRingPosition,
  RING_WALL,
  type RingParams,
} from './shapes'
import { RING_EDGE_MARGIN, TEXT_BORDER_MIN } from './schema'
import type { ContentItem, KeychainParams } from './schema'
import type { BuildKeychainResult } from './buildKeychain'

const FALLBACK_HALF_WIDTH = 4
const FALLBACK_HALF_HEIGHT = 3
const FALLBACK_PADDING = 5
const DRAG_THRESHOLD = 0.5
const HEADING_ID = 'text-position-editor-heading'

const KEY_DELTAS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: -1 },
}

function clamp(value: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2
  return Math.min(max, Math.max(min, value))
}

function rectShapeFromBB(bb: BoundingBox2D): Shape {
  return new Shape([
    new Vector2(bb.minX, bb.minY),
    new Vector2(bb.maxX, bb.minY),
    new Vector2(bb.maxX, bb.maxY),
    new Vector2(bb.minX, bb.maxY),
  ])
}

function nameFallbackBB(contents: ContentItem[]): BoundingBox2D {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const item of contents) {
    minX = Math.min(minX, item.offsetX - FALLBACK_HALF_WIDTH - FALLBACK_PADDING)
    maxX = Math.max(maxX, item.offsetX + FALLBACK_HALF_WIDTH + FALLBACK_PADDING)
    minY = Math.min(minY, item.offsetY - FALLBACK_HALF_HEIGHT - FALLBACK_PADDING)
    maxY = Math.max(maxY, item.offsetY + FALLBACK_HALF_HEIGHT + FALLBACK_PADDING)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { minX: -10, maxX: 10, minY: -10, maxY: 10 }
  }

  return { minX, maxX, minY, maxY }
}

function nameRingCenter(bb: BoundingBox2D, ring: RingParams): { x: number; y: number } {
  const radius = ring.innerDiameter / 2
  const inset = RING_EDGE_MARGIN + radius + ring.radialOffset + ring.embedding
  const cx = (bb.minX + bb.maxX) / 2
  const cy = (bb.minY + bb.maxY) / 2

  switch (ring.position) {
    case 'top':
      return { x: cx + ring.lateralOffset, y: bb.maxY - inset }
    case 'bottom':
      return { x: cx + ring.lateralOffset, y: bb.minY + inset }
    case 'left':
      return { x: bb.minX + inset, y: cy + ring.lateralOffset }
    case 'right':
      return { x: bb.maxX - inset, y: cy + ring.lateralOffset }
  }
}

function halfSize(built: { halfWidth: number; halfHeight: number } | undefined): {
  halfWidth: number
  halfHeight: number
} {
  return {
    halfWidth: built && built.halfWidth > 0 ? built.halfWidth : FALLBACK_HALF_WIDTH,
    halfHeight: built && built.halfHeight > 0 ? built.halfHeight : FALLBACK_HALF_HEIGHT,
  }
}

interface TextPositionEditorProps {
  params: KeychainParams
  geometry: BuildKeychainResult | null
  selectedContentId: string
  onSelectContent: (id: string) => void
  onMoveContent: (id: string, x: number, y: number) => void
  onClose: () => void
}

export function TextPositionEditor({
  params,
  geometry,
  selectedContentId,
  onSelectContent,
  onMoveContent,
  onClose,
}: TextPositionEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<{
    id: string
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  const paramsRef = useRef(params)
  paramsRef.current = params
  const geometryRef = useRef(geometry)
  geometryRef.current = geometry
  const onMoveContentRef = useRef(onMoveContent)
  onMoveContentRef.current = onMoveContent
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null)

  const ring = useMemo<RingParams>(() => ({
    position: params.ringPosition,
    innerDiameter: params.ringInnerDiameter,
    embedding: params.ringEmbedding,
    lateralOffset: params.ringLateralOffset,
    radialOffset: params.ringRadialOffset,
  }), [
    params.ringPosition,
    params.ringInnerDiameter,
    params.ringEmbedding,
    params.ringLateralOffset,
    params.ringRadialOffset,
  ])

  const fallbackNameBB = useMemo(() => nameFallbackBB(params.contents), [params.contents])
  const nameBB = params.baseShape === 'name'
    ? geometry?.pieceBB ?? fallbackNameBB
    : null

  const ringCenter = nameBB
    ? nameRingCenter(nameBB, ring)
    : getClampedRingPosition(params.baseShape, params.width, params.height, ring)
  const hole = geometry?.hole ?? {
    x: ringCenter.x,
    y: ringCenter.y,
    radius: ring.innerDiameter / 2,
  }

  const { minX, minY, maxY, vbWidth, vbHeight, basePoints } = useMemo(() => {
    const baseShape = params.baseShape === 'name'
      ? rectShapeFromBB(nameBB ?? fallbackNameBB)
      : createBaseShape(params.baseShape, params.width, params.height, ring)
    const points = baseShape.getPoints(64)
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const mnX = Math.min(...xs) - FALLBACK_PADDING
    const mxX = Math.max(...xs) + FALLBACK_PADDING
    const mnY = Math.min(...ys) - FALLBACK_PADDING
    const mxY = Math.max(...ys) + FALLBACK_PADDING
    return {
      minX: mnX,
      minY: mnY,
      maxY: mxY,
      vbWidth: mxX - mnX,
      vbHeight: mxY - mnY,
      basePoints: points.map((p) => `${p.x},${-p.y}`).join(' '),
    }
  }, [params, ring, nameBB, fallbackNameBB])

  const region = useMemo(() => getUsableRegion(params), [params])

  const contentBoxes = params.contents.map((item) => {
    const built = geometry?.contentItems.find((content) => content.id === item.id)
    return {
      id: item.id,
      label: item.kind === 'text' ? item.content : 'ícone',
      x: item.offsetX,
      y: item.offsetY,
      ...halfSize(built),
    }
  })
  const contentBoxesRef = useRef(contentBoxes)
  contentBoxesRef.current = contentBoxes

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }

    if (typeof svg.getScreenCTM === 'function' && typeof svg.createSVGPoint === 'function') {
      const ctm = svg.getScreenCTM()
      if (ctm) {
        const pt = svg.createSVGPoint()
        pt.x = clientX
        pt.y = clientY
        const mapped = pt.matrixTransform(ctm.inverse())
        if (Number.isFinite(mapped.x) && Number.isFinite(mapped.y)) {
          return { x: mapped.x, y: -mapped.y }
        }
      }
    }

    const rect = svg.getBoundingClientRect()
    const scaleX = vbWidth / (rect.width || 1)
    const scaleY = vbHeight / (rect.height || 1)
    return {
      x: (clientX - rect.left) * scaleX + minX,
      y: -((clientY - rect.top) * scaleY + minY),
    }
  }, [vbWidth, vbHeight, minX, minY])

  const clampPosition = useCallback((
    pos: { x: number; y: number },
    halfWidth: number,
    halfHeight: number,
  ) => {
    const p = paramsRef.current
    const currentGeometry = geometryRef.current

    const applyRegion = (value: { x: number; y: number }) => {
      const usable = getUsableRegion(p)
      if (usable?.kind === 'rect') {
        return {
          x: clamp(value.x, usable.minX + halfWidth, usable.maxX - halfWidth),
          y: clamp(value.y, usable.minY + halfHeight, usable.maxY - halfHeight),
        }
      }
      if (usable?.kind === 'circle') {
        const local = clampOffset(usable, halfWidth, halfHeight, value)
        return { x: usable.cx + local.x, y: usable.cy + local.y }
      }
      return value
    }

    let result = applyRegion(pos)

    if (p.baseShape === 'name' && currentGeometry) {
      const bb = currentGeometry.pieceBB
      result = {
        x: clamp(
          result.x,
          bb.minX + TEXT_BORDER_MIN + halfWidth,
          bb.maxX - TEXT_BORDER_MIN - halfWidth,
        ),
        y: clamp(
          result.y,
          bb.minY + TEXT_BORDER_MIN + halfHeight,
          bb.maxY - TEXT_BORDER_MIN - halfHeight,
        ),
      }
    }

    if (currentGeometry) {
      const adjusted = clampTextPosition(
        { ...result, halfWidth, halfHeight },
        currentGeometry.pieceBB,
        currentGeometry.hole,
      )
      result = applyRegion(adjusted)
    }

    return result
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const pos = toSvg(e.clientX, e.clientY)
      const deltaX = pos.x - drag.startX
      const deltaY = pos.y - drag.startY

      if (!drag.moved && Math.hypot(deltaX, deltaY) <= DRAG_THRESHOLD) return

      const box = contentBoxesRef.current.find((content) => content.id === drag.id)
      if (!box) return

      drag.moved = true
      const next = clampPosition(
        { x: drag.originX + deltaX, y: drag.originY + deltaY },
        box.halfWidth,
        box.halfHeight,
      )
      setDragPos({ id: drag.id, x: next.x, y: next.y })
    }

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      if (drag.moved) {
        const box = contentBoxesRef.current.find((content) => content.id === drag.id)
        const pos = toSvg(e.clientX, e.clientY)
        if (box) {
          const next = clampPosition(
            {
              x: drag.originX + pos.x - drag.startX,
              y: drag.originY + pos.y - drag.startY,
            },
            box.halfWidth,
            box.halfHeight,
          )
          onMoveContentRef.current(drag.id, next.x, next.y)
        }
      }

      dragRef.current = null
      setDragPos(null)
    }

    const onCancel = () => {
      dragRef.current = null
      setDragPos(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
    }
  }, [toSvg, clampPosition])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  const handlePointerDown = useCallback((id: string, e: ReactPointerEvent) => {
    e.stopPropagation()
    onSelectContent(id)

    const box = contentBoxesRef.current.find((content) => content.id === id)
    if (!box) return

    const pos = toSvg(e.clientX, e.clientY)
    dragRef.current = {
      id,
      startX: pos.x,
      startY: pos.y,
      originX: box.x,
      originY: box.y,
      moved: false,
    }
  }, [onSelectContent, toSvg])

  const handleKeyDown = useCallback((
    id: string,
    e: ReactKeyboardEvent<SVGGElement>,
  ) => {
    const delta = KEY_DELTAS[e.key]
    if (!delta) return

    const box = contentBoxesRef.current.find((content) => content.id === id)
    if (!box) return

    e.preventDefault()
    const next = clampPosition(
      { x: box.x + delta.x, y: box.y + delta.y },
      box.halfWidth,
      box.halfHeight,
    )
    onMoveContentRef.current(id, next.x, next.y)
  }, [clampPosition])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={HEADING_ID}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[90vw] max-w-2xl rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Flex direction="row" justifyContent="space-between" alignItems="center" marginBottom="medium">
          <Heading id={HEADING_ID} level={2} fontSize="large">Posicionar conteúdos</Heading>
          <Button
            ref={closeButtonRef}
            size="small"
            variation="link"
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </Button>
        </Flex>

        <svg
          ref={svgRef}
          data-testid="editor-svg"
          viewBox={`${minX} ${-maxY} ${vbWidth} ${vbHeight}`}
          className="w-full touch-none select-none rounded border border-neutral-200"
        >
          <rect x={minX} y={-maxY} width={vbWidth} height={vbHeight} fill="#f5f5f5" />
          <polygon data-testid="editor-base" points={basePoints} fill="#ccfbf1" stroke="#14b8a6" strokeWidth="0.3" />
          {region?.kind === 'rect' && (
            <rect
              data-testid="editor-valid-area"
              x={region.minX}
              y={-region.maxY}
              width={region.maxX - region.minX}
              height={region.maxY - region.minY}
              fill="none"
              stroke="#14b8a680"
              strokeWidth="0.2"
              strokeDasharray="1,0.5"
            />
          )}
          {region?.kind === 'circle' && (
            <circle
              data-testid="editor-valid-area"
              cx={region.cx}
              cy={-region.cy}
              r={region.radius}
              fill="none"
              stroke="#14b8a680"
              strokeWidth="0.2"
              strokeDasharray="1,0.5"
            />
          )}
          <circle data-testid="editor-ring" cx={hole.x} cy={-hole.y} r={hole.radius + RING_WALL} fill="#99f6e4" />
          <circle data-testid="editor-hole" cx={hole.x} cy={-hole.y} r={hole.radius} fill="white" stroke="#14b8a6" strokeWidth="0.3" />

          {contentBoxes.map((box) => {
            const isDragging = dragPos?.id === box.id
            const x = isDragging ? dragPos.x : box.x
            const y = isDragging ? dragPos.y : box.y
            const selected = box.id === selectedContentId
            return (
              <g
                key={box.id}
                data-testid={`editor-content-${box.id}`}
                role="button"
                tabIndex={0}
                aria-label={`Mover ${box.label}`}
                onPointerDown={(e) => handlePointerDown(box.id, e)}
                onKeyDown={(e) => handleKeyDown(box.id, e)}
                style={{ cursor: 'grab' }}
              >
                <rect
                  x={x - box.halfWidth}
                  y={-y - box.halfHeight}
                  width={box.halfWidth * 2}
                  height={box.halfHeight * 2}
                  fill={selected ? '#14b8a6' : '#0d948899'}
                  stroke={selected ? '#0f766e' : 'transparent'}
                  strokeWidth="0.3"
                />
                <text
                  x={x}
                  y={-y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(box.halfHeight * 1.2, 4)}
                  fill="white"
                  pointerEvents="none"
                >
                  {box.label.slice(0, 10)}
                </text>
              </g>
            )
          })}
        </svg>

        <Flex justifyContent="flex-end" marginTop="medium">
          <Button variation="primary" onClick={onClose}>Concluir</Button>
        </Flex>
      </div>
    </div>
  )
}
