import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { Button, Flex, Heading } from '@aws-amplify/ui-react'
import { clampOffset, getUsableRegion } from './autoFit'
import { createCardShape } from './shapes'
import type { CardParams } from './schema'
import type { BuildCardResult } from './buildCard'

const FALLBACK_HALF_WIDTH = 4
const FALLBACK_HALF_HEIGHT = 3
const FALLBACK_PADDING = 5
const DRAG_THRESHOLD = 0.5
const HEADING_ID = 'card-position-editor-heading'

const KEY_DELTAS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: -1 },
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

function labelOf(item: CardParams['contents'][number]): string {
  if (item.kind === 'text') return item.content || 'Texto'
  return 'ícone'
}

interface TextPositionEditorProps {
  params: CardParams
  geometry: BuildCardResult | null
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
  const onMoveContentRef = useRef(onMoveContent)
  onMoveContentRef.current = onMoveContent
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null)

  const region = useMemo(() => getUsableRegion(params), [params])

  const { minX, minY, maxY, vbWidth, vbHeight, basePoints } = useMemo(() => {
    const points = createCardShape(params.width, params.height, params.cornerRadius).getPoints(64)
    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    const min = Math.min(...xs) - FALLBACK_PADDING
    const max = Math.max(...xs) + FALLBACK_PADDING
    const minYValue = Math.min(...ys) - FALLBACK_PADDING
    const maxYValue = Math.max(...ys) + FALLBACK_PADDING
    return {
      minX: min,
      minY: minYValue,
      maxY: maxYValue,
      vbWidth: max - min,
      vbHeight: maxYValue - minYValue,
      basePoints: points.map((point) => `${point.x},${-point.y}`).join(' '),
    }
  }, [params.width, params.height, params.cornerRadius])

  const contentBoxes = params.contents.map((item) => {
    const built = geometry?.contentItems.find((content) => content.id === item.id)
    const { halfWidth, halfHeight } = halfSize(built)
    const position = clampOffset(region, halfWidth, halfHeight, {
      x: item.offsetX,
      y: item.offsetY,
    })
    return {
      id: item.id,
      label: labelOf(item),
      x: position.x,
      y: position.y,
      halfWidth,
      halfHeight,
    }
  })
  const contentBoxesRef = useRef(contentBoxes)
  contentBoxesRef.current = contentBoxes

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }

    if (typeof svg.getScreenCTM === 'function' && typeof svg.createSVGPoint === 'function') {
      const matrix = svg.getScreenCTM()
      if (matrix) {
        const point = svg.createSVGPoint()
        point.x = clientX
        point.y = clientY
        const mapped = point.matrixTransform(matrix.inverse())
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
    position: { x: number; y: number },
    halfWidth: number,
    halfHeight: number,
  ) => {
    const currentRegion = getUsableRegion(paramsRef.current)
    return clampOffset(currentRegion, halfWidth, halfHeight, position)
  }, [])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const position = toSvg(event.clientX, event.clientY)
      const deltaX = position.x - drag.startX
      const deltaY = position.y - drag.startY
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

    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      if (drag.moved) {
        const box = contentBoxesRef.current.find((content) => content.id === drag.id)
        const position = toSvg(event.clientX, event.clientY)
        if (box) {
          const next = clampPosition(
            {
              x: drag.originX + position.x - drag.startX,
              y: drag.originY + position.y - drag.startY,
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  const handlePointerDown = useCallback((id: string, event: ReactPointerEvent) => {
    event.stopPropagation()
    onSelectContent(id)

    const box = contentBoxesRef.current.find((content) => content.id === id)
    if (!box) return

    const position = toSvg(event.clientX, event.clientY)
    dragRef.current = {
      id,
      startX: position.x,
      startY: position.y,
      originX: box.x,
      originY: box.y,
      moved: false,
    }
  }, [onSelectContent, toSvg])

  const handleKeyDown = useCallback((
    id: string,
    event: ReactKeyboardEvent<SVGGElement>,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectContent(id)
      return
    }

    const delta = KEY_DELTAS[event.key]
    if (!delta) return

    const box = contentBoxesRef.current.find((content) => content.id === id)
    if (!box) return

    event.preventDefault()
    const next = clampPosition(
      { x: box.x + delta.x, y: box.y + delta.y },
      box.halfWidth,
      box.halfHeight,
    )
    onMoveContentRef.current(id, next.x, next.y)
  }, [clampPosition, onSelectContent])

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
        onClick={(event) => event.stopPropagation()}
      >
        <Flex direction="row" justifyContent="space-between" alignItems="center" marginBottom="medium">
          <Heading id={HEADING_ID} level={2} fontSize="large">
            Posicionar conteúdos
          </Heading>
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
          <polygon
            data-testid="editor-base"
            points={basePoints}
            fill="#ccfbf1"
            stroke="#14b8a6"
            strokeWidth="0.3"
          />
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
                onPointerDown={(event) => handlePointerDown(box.id, event)}
                onFocus={() => onSelectContent(box.id)}
                onKeyDown={(event) => handleKeyDown(box.id, event)}
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
          <Button variation="primary" onClick={onClose}>
            Concluir
          </Button>
        </Flex>
      </div>
    </div>
  )
}
