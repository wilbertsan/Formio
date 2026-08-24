import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Button, Flex, Heading } from '@aws-amplify/ui-react'
import { createBaseShape, getRingPosition, RING_WALL } from '../keychain/shapes'
import { snapTextToSupport } from '../keychain/positioning'
import { TEXT_BORDER_MIN } from '../keychain/schema'
import type { KeychainParams } from '../keychain/schema'

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

  const halfW = params.width / 2
  const halfH = params.width / 4
  const ring = {
    position: params.ringPosition,
    innerDiameter: params.ringInnerDiameter,
    thickness: RING_WALL,
    embedding: params.ringEmbedding,
    lateralOffset: params.ringLateralOffset,
    radialOffset: params.ringRadialOffset,
  }
  const holeCenter = getRingPosition(params.baseShape, params.width, params.width, ring)
  const hole = { x: holeCenter.x, y: holeCenter.y, radius: ring.innerDiameter / 2 }

  const baseShape = createBaseShape(params.baseShape, params.width, params.width, ring)
  const basePoints = baseShape.getPoints(64).map((p) => `${p.x},${-p.y}`).join(' ')

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const p = paramsRef.current
    const vbW = p.width + 10
    const vbH = p.width / 2 + 10
    const scaleX = vbW / (rect.width || 1)
    const scaleY = vbH / (rect.height || 1)
    return {
      x: (clientX - rect.left) * scaleX - vbW / 2,
      y: -(clientY - rect.top) * scaleY + vbH / 2 - 5,
    }
  }, [])

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
        const halfW = p.width / 2
        const halfH = p.width / 4
        const bb = { minX: -halfW, maxX: halfW, minY: -halfH, maxY: halfH }
        const r = {
          position: p.ringPosition,
          innerDiameter: p.ringInnerDiameter,
          thickness: RING_WALL,
          embedding: p.ringEmbedding,
          lateralOffset: p.ringLateralOffset,
          radialOffset: p.ringRadialOffset,
        }
        const center = getRingPosition(p.baseShape, p.width, p.width, r)
        const h = { x: center.x, y: center.y, radius: r.innerDiameter / 2 }
        const pos = toSvg(e.clientX, e.clientY)
        const supports = p.texts
          .filter((t) => t.id !== drag.id)
          .map((t) => ({
            x: t.offsetX,
            y: t.offsetY,
            halfWidth: t.width / 2,
            halfHeight: t.height / 2,
          }))
        const snapped = snapTextToSupport(
          { x: pos.x, y: pos.y, halfWidth: item.width / 2, halfHeight: item.height / 2 },
          { supports, pieceBB: bb, hole: h },
        )
        onMoveTextRef.current(drag.id, snapped.x, snapped.y)
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
  }, [toSvg])

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
          viewBox={`${-halfW - 5} ${-halfH - 5} ${halfW * 2 + 10} ${halfH * 2 + 10}`}
          className="w-full touch-none select-none rounded border border-neutral-200"
        >
          <rect x={-halfW - 5} y={halfH + 5} width={halfW * 2 + 10} height={halfH * 2 + 10} fill="#f5f5f5" />
          <polygon data-testid="editor-base" points={basePoints} fill="#ccfbf1" stroke="#14b8a6" strokeWidth="0.3" />
          <rect
            data-testid="editor-valid-area"
            x={-halfW + TEXT_BORDER_MIN}
            y={halfH - TEXT_BORDER_MIN}
            width={(halfW - TEXT_BORDER_MIN) * 2}
            height={(halfH - TEXT_BORDER_MIN) * 2}
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
