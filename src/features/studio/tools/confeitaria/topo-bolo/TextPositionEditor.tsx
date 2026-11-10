import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { Button, Flex, Heading } from '@aws-amplify/ui-react'
import { Shape, Vector2 } from 'three'
import type { BuildCakeTopperResult } from './buildCakeTopper'
import { getPlateShapes } from './buildCakeTopper'
import { fitIconHalfSize, iconGeometryHalfSize, ICON_MARGIN } from './iconLayout'
import { clampToOutline, outlineSpec, type PlateBounds } from './placement'
import {
  OFFSET_X_RANGE,
  OFFSET_Y_RANGE,
  type CakeTopperParams,
} from './schema'

const ICON_ID = 'icon'
const TEXT_MARGIN = 4
const PADDING = 5
const DRAG_THRESHOLD = 0.5
const HEADING_ID = 'content-position-editor-heading'
const HINT_ID = 'content-position-editor-hint'
const KEY_DELTAS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: -1 },
}

interface TextPositionEditorProps {
  params: CakeTopperParams
  geometry: BuildCakeTopperResult | null
  selectedContentId: string
  onSelectContent: (id: string) => void
  onMoveContent: (id: string, x: number, y: number) => void
  onClose: () => void
}

interface EditorContent {
  id: string
  kind: 'text' | 'icon'
  label: string
  x: number
  y: number
  halfWidth: number
  halfHeight: number
  margin: number
}

interface PlateBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function shapeToPath(shape: Shape): string {
  const toPath = (points: Vector2[]): string =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${-point.y}`).join(' ') + ' Z'
  const outer = toPath(shape.getPoints(64))
  const holes = shape.holes.map((hole) => toPath(hole.getPoints(64))).join(' ')
  return holes ? `${outer} ${holes}` : outer
}

function shapesBounds(shapes: Shape[]): PlateBox {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  const expand = (point: Vector2): void => {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }

  for (const shape of shapes) {
    shape.getPoints(64).forEach(expand)
    for (const hole of shape.holes) hole.getPoints(64).forEach(expand)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { minX: -10, maxX: 10, minY: -10, maxY: 10 }
  }
  return { minX, maxX, minY, maxY }
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
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
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
  const plateBoundsRef = useRef<PlateBounds>({ halfWidth: 1, halfHeight: 1 })
  const contentBoxesRef = useRef<EditorContent[]>([])
  const onMoveContentRef = useRef(onMoveContent)
  onMoveContentRef.current = onMoveContent
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null)

  const plateShapes = useMemo(
    () => getPlateShapes({
      shape: params.shape,
      width: params.width,
      height: params.height,
      cornerRadius: params.cornerRadius,
      contourSvg: params.contourSvg,
    }),
    [params.shape, params.width, params.height, params.cornerRadius, params.contourSvg],
  )
  const platePaths = useMemo(() => plateShapes.map(shapeToPath), [plateShapes])
  const plate = useMemo(() => shapesBounds(plateShapes), [plateShapes])
  const plateBounds = useMemo<PlateBounds>(() => ({
    halfWidth: (plate.maxX - plate.minX) / 2,
    halfHeight: (plate.maxY - plate.minY) / 2,
  }), [plate])
  plateBoundsRef.current = plateBounds

  const viewMinX = plate.minX - PADDING
  const viewMinY = -(plate.maxY + PADDING)
  const vbWidth = plate.maxX - plate.minX + 2 * PADDING
  const vbHeight = plate.maxY - plate.minY + 2 * PADDING

  const contentBoxes = useMemo<EditorContent[]>(() => {
    const built = geometry?.contentItems ?? []
    const items: EditorContent[] = params.texts.map((text) => {
      const item = built.find((content) => content.id === text.id)
      const halfWidth = Math.min(
        item?.halfWidth ?? text.width / 2,
        plateBounds.halfWidth - TEXT_MARGIN,
      )
      const halfHeight = Math.min(
        item?.halfHeight ?? text.height / 2,
        plateBounds.halfHeight - TEXT_MARGIN,
      )
      const placed = clampToOutline(
        params,
        plateBounds,
        halfWidth,
        halfHeight,
        text.offsetX,
        text.offsetY,
        TEXT_MARGIN,
      )
      return {
        id: text.id,
        kind: 'text',
        label: text.content || 'Texto',
        x: placed.x,
        y: placed.y,
        halfWidth,
        halfHeight,
        margin: TEXT_MARGIN,
      }
    })

    if (params.svgIcon) {
      const item = built.find((content) => content.id === ICON_ID)
      const raw = item ? null : iconGeometryHalfSize(
        params.svgIcon,
        params.width,
        params.height,
        params.iconScale,
      )
      const fallback = raw ? fitIconHalfSize(raw, params, plateBounds) : null
      const halfWidth = item?.halfWidth ?? fallback?.halfWidth ?? 4
      const halfHeight = item?.halfHeight ?? fallback?.halfHeight ?? 4
      const placed = clampToOutline(
        params,
        plateBounds,
        halfWidth,
        halfHeight,
        params.iconOffsetX,
        params.iconOffsetY,
        ICON_MARGIN,
      )
      items.push({
        id: ICON_ID,
        kind: 'icon',
        label: 'Ícone',
        x: placed.x,
        y: placed.y,
        halfWidth,
        halfHeight,
        margin: ICON_MARGIN,
      })
    }

    return items
  }, [params, geometry, plateBounds])
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
      x: (clientX - rect.left) * scaleX + viewMinX,
      y: -((clientY - rect.top) * scaleY + viewMinY),
    }
  }, [vbWidth, vbHeight, viewMinX, viewMinY])

  const clampPosition = useCallback((
    content: EditorContent,
    x: number,
    y: number,
  ): { x: number; y: number } => {
    const placed = clampToOutline(
      paramsRef.current,
      plateBoundsRef.current,
      content.halfWidth,
      content.halfHeight,
      x,
      y,
      content.margin,
    )
    return {
      x: Math.min(OFFSET_X_RANGE.max, Math.max(OFFSET_X_RANGE.min, placed.x)),
      y: Math.min(OFFSET_Y_RANGE.max, Math.max(OFFSET_Y_RANGE.min, placed.y)),
    }
  }, [])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const pos = toSvg(event.clientX, event.clientY)
      const deltaX = pos.x - drag.startX
      const deltaY = pos.y - drag.startY
      if (!drag.moved && Math.hypot(deltaX, deltaY) <= DRAG_THRESHOLD) return

      const content = contentBoxesRef.current.find((item) => item.id === drag.id)
      if (!content) return

      drag.moved = true
      const next = clampPosition(content, drag.originX + deltaX, drag.originY + deltaY)
      setDragPos({ id: drag.id, x: next.x, y: next.y })
    }

    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      if (drag.moved) {
        const content = contentBoxesRef.current.find((item) => item.id === drag.id)
        const pos = toSvg(event.clientX, event.clientY)
        if (content) {
          const next = clampPosition(
            content,
            drag.originX + pos.x - drag.startX,
            drag.originY + pos.y - drag.startY,
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
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    closeButtonRef.current?.focus()
    return () => previousFocusRef.current?.focus()
  }, [])

  const handleDialogKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const container = dialogRef.current
    if (!container) return
    const focusable = Array.from(container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hasAttribute('disabled'))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }, [])

  const handlePointerDown = useCallback((
    id: string,
    event: ReactPointerEvent<SVGGElement>,
  ) => {
    if (event.button !== 0 || event.isPrimary === false) return
    event.stopPropagation()
    onSelectContent(id)

    const content = contentBoxesRef.current.find((item) => item.id === id)
    if (!content) return

    const pos = toSvg(event.clientX, event.clientY)
    dragRef.current = {
      id,
      startX: pos.x,
      startY: pos.y,
      originX: content.x,
      originY: content.y,
      moved: false,
    }
  }, [onSelectContent, toSvg])

  const handleKeyDown = useCallback((
    id: string,
    event: ReactKeyboardEvent<SVGGElement>,
  ) => {
    const delta = KEY_DELTAS[event.key]
    if (!delta) return

    const content = contentBoxesRef.current.find((item) => item.id === id)
    if (!content) return

    event.preventDefault()
    const next = clampPosition(content, content.x + delta.x, content.y + delta.y)
    onMoveContentRef.current(id, next.x, next.y)
  }, [clampPosition])

  const validArea = outlineSpec(params, plateBounds, TEXT_MARGIN)

  return (
    <div
      data-testid="text-editor"
      role="dialog"
      aria-modal="true"
      aria-labelledby={HEADING_ID}
      aria-describedby={HINT_ID}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="w-[90vw] max-w-2xl rounded-lg bg-white p-4 shadow-xl"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
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
          viewBox={`${viewMinX} ${viewMinY} ${vbWidth} ${vbHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full max-h-[70vh] touch-none select-none rounded border border-neutral-200"
        >
          <rect x={viewMinX} y={viewMinY} width={vbWidth} height={vbHeight} fill="#f5f5f5" />
          <g data-testid="editor-base">
            {platePaths.map((path, index) => (
              <path
                key={index}
                d={path}
                fill="#e4e4e7"
                stroke="#a1a1aa"
                strokeWidth={0.3}
                fillRule="evenodd"
              />
            ))}
          </g>
          {validArea.box ? (
            <rect
              data-testid="editor-valid-area"
              x={-validArea.rx}
              y={-validArea.ry}
              width={validArea.rx * 2}
              height={validArea.ry * 2}
              fill="none"
              stroke="#14b8a680"
              strokeWidth={0.2}
              strokeDasharray="1,0.5"
            />
          ) : (
            <ellipse
              data-testid="editor-valid-area"
              cx={0}
              cy={0}
              rx={validArea.rx}
              ry={validArea.ry}
              fill="none"
              stroke="#14b8a680"
              strokeWidth={0.2}
              strokeDasharray="1,0.5"
            />
          )}
          {contentBoxes.map((content) => {
            const isDragging = dragPos?.id === content.id
            const x = isDragging ? dragPos.x : content.x
            const y = isDragging ? dragPos.y : content.y
            const selected = content.id === selectedContentId
            return (
              <g
                key={content.id}
                data-testid={`editor-content-${content.id}`}
                role="button"
                tabIndex={0}
                aria-label={`Mover ${content.label}`}
                aria-pressed={selected}
                onFocus={() => onSelectContent(content.id)}
                onPointerDown={(event) => handlePointerDown(content.id, event)}
                onKeyDown={(event) => handleKeyDown(content.id, event)}
                style={{ cursor: 'grab' }}
              >
                <rect
                  x={x - content.halfWidth}
                  y={-y - content.halfHeight}
                  width={content.halfWidth * 2}
                  height={content.halfHeight * 2}
                  fill={selected ? '#14b8a6' : '#0d948899'}
                  stroke={selected ? '#0f766e' : 'transparent'}
                  strokeWidth={0.3}
                />
                <text
                  x={x}
                  y={-y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(content.halfHeight * 1.2, 4)}
                  fill="white"
                  pointerEvents="none"
                >
                  {content.label.slice(0, 10)}
                </text>
              </g>
            )
          })}
        </svg>

        <p id={HINT_ID} className="mt-2 text-sm text-neutral-500">
          Arraste os conteúdos ou use as setas do teclado.
        </p>

        <Flex justifyContent="flex-end" marginTop="medium">
          <Button variation="primary" onClick={onClose}>Concluir</Button>
        </Flex>
      </div>
    </div>
  )
}
