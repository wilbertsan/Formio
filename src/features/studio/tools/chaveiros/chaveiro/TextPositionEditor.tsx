import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Button, Flex, Heading } from '@aws-amplify/ui-react'
import { Shape, Vector2 } from 'three'
import { createBaseShape, getRingPosition, RING_WALL } from './shapes'
import { TEXT_BORDER_MIN } from './schema'
import type { KeychainParams, TextItem } from './schema'

function createNameBaseShape(texts: TextItem[]): Shape {
  const points: Vector2[] = []
  for (const text of texts) {
    points.push(new Vector2(text.offsetX - text.width / 2, text.offsetY - text.height / 2))
    points.push(new Vector2(text.offsetX + text.width / 2, text.offsetY + text.height / 2))
  }

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs) - 5
  const maxX = Math.max(...xs) + 5
  const minY = Math.min(...ys) - 5
  const maxY = Math.max(...ys) + 5

  return new Shape([
    new Vector2(minX, minY),
    new Vector2(maxX, minY),
    new Vector2(maxX, maxY),
    new Vector2(minX, maxY),
  ])
}

interface TextPositionEditorProps {
  params: KeychainParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onMoveText: (id: string, x: number, y: number) => void
  onClose: () => void
}

export function TextPositionEditor({
  params,
  selectedTextId,
  onSelectText,
  onMoveText,
  onClose,
}: TextPositionEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ id: string } | null>(null)
  const paramsRef = useRef(params)
  paramsRef.current = params
  const onMoveTextRef = useRef(onMoveText)
  onMoveTextRef.current = onMoveText
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null)

  const ring = {
    position: params.ringPosition,
    innerDiameter: params.ringInnerDiameter,
    thickness: RING_WALL,
    embedding: params.ringEmbedding,
    lateralOffset: params.ringLateralOffset,
    radialOffset: params.ringRadialOffset,
  }
  const holeCenter = getRingPosition(params.baseShape, params.width, params.height, ring)
  const hole = { x: holeCenter.x, y: holeCenter.y, radius: ring.innerDiameter / 2 }

  const baseShape = params.baseShape === 'name'
    ? createNameBaseShape(params.texts)
    : createBaseShape(params.baseShape, params.width, params.height, ring)

  const { minX, maxX, minY, maxY, vbWidth, vbHeight, basePoints } = useMemo(() => {
    const points = baseShape.getPoints(64)
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const mnX = Math.min(...xs) - 5
    const mxX = Math.max(...xs) + 5
    const mnY = Math.min(...ys) - 5
    const mxY = Math.max(...ys) + 5
    return {
      minX: mnX,
      maxX: mxX,
      minY: mnY,
      maxY: mxY,
      vbWidth: mxX - mnX,
      vbHeight: mxY - mnY,
      basePoints: points.map((p) => `${p.x},${-p.y}`).join(' '),
    }
  }, [baseShape])

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const scaleX = vbWidth / (rect.width || 1)
    const scaleY = vbHeight / (rect.height || 1)
    return {
      x: (clientX - rect.left) * scaleX + minX,
      y: -((clientY - rect.top) * scaleY + minY),
    }
  }, [vbWidth, vbHeight, minX, minY])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      const pos = toSvg(e.clientX, e.clientY)
      setDragPos({ id: dragRef.current.id, x: pos.x, y: pos.y })
    }
    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const p = paramsRef.current
      const item = p.texts.find((t) => t.id === drag.id)
      if (item) {
        const pos = toSvg(e.clientX, e.clientY)
        const clampedX = Math.max(minX + TEXT_BORDER_MIN, Math.min(maxX - TEXT_BORDER_MIN - item.width, pos.x))
        const clampedY = Math.max(minY + TEXT_BORDER_MIN + item.height, Math.min(maxY - TEXT_BORDER_MIN, pos.y))
        onMoveTextRef.current(drag.id, clampedX, clampedY)
      }
      dragRef.current = null
      setDragPos(null)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [toSvg, minX, maxX, minY, maxY])

  const handlePointerDown = useCallback((id: string, e: ReactPointerEvent) => {
    e.stopPropagation()
    onSelectText(id)
    dragRef.current = { id }
    setDragPos({ id, x: 0, y: 0 })
  }, [onSelectText])

  return (
    <div role="dialog" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[90vw] max-w-2xl rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Flex direction="row" justifyContent="space-between" alignItems="center" marginBottom="medium">
          <Heading level={2} fontSize="large">Posicionar textos</Heading>
          <Button size="small" variation="link" onClick={onClose}>✕</Button>
        </Flex>

        <svg
          ref={svgRef}
          data-testid="editor-svg"
          viewBox={`${minX} ${-maxY} ${vbWidth} ${vbHeight}`}
          className="w-full touch-none select-none rounded border border-neutral-200"
        >
          <rect x={minX} y={-maxY} width={vbWidth} height={vbHeight} fill="#f5f5f5" />
          <polygon data-testid="editor-base" points={basePoints} fill="#ccfbf1" stroke="#14b8a6" strokeWidth="0.3" />
          <rect
            data-testid="editor-valid-area"
            x={minX + TEXT_BORDER_MIN}
            y={-(maxY - TEXT_BORDER_MIN)}
            width={vbWidth - TEXT_BORDER_MIN * 2}
            height={vbHeight - TEXT_BORDER_MIN * 2}
            fill="none"
            stroke="#14b8a680"
            strokeWidth="0.2"
            strokeDasharray="1,0.5"
          />
          <circle data-testid="editor-ring" cx={hole.x} cy={-hole.y} r={hole.radius + RING_WALL} fill="#99f6e4" />
          <circle data-testid="editor-hole" cx={hole.x} cy={-hole.y} r={hole.radius} fill="white" stroke="#14b8a6" strokeWidth="0.3" />

          {params.texts.map((t) => {
            const isDragging = dragPos?.id === t.id
            const x = isDragging ? dragPos!.x : t.offsetX
            const y = isDragging ? dragPos!.y : t.offsetY
            const selected = t.id === selectedTextId
            return (
              <g
                key={t.id}
                data-testid={`editor-text-${t.id}`}
                onPointerDown={(e) => handlePointerDown(t.id, e)}
                style={{ cursor: 'grab' }}
              >
                <rect
                  x={x - t.width / 2}
                  y={-y - t.height / 2}
                  width={t.width}
                  height={t.height}
                  fill={selected ? '#14b8a6' : '#0d948899'}
                  stroke={selected ? '#0f766e' : 'transparent'}
                  strokeWidth="0.3"
                />
                <text
                  x={x}
                  y={-y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(t.height * 0.6, 4)}
                  fill="white"
                  pointerEvents="none"
                >
                  {t.content.slice(0, 10)}
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
