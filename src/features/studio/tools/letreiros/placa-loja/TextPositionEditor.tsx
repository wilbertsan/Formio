import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlacaLojaParams } from './schema'

interface TextPositionEditorProps {
  params: PlacaLojaParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onMoveText: (id: string, x: number, y: number) => void
  onClose: () => void
}

const TEXT_MARGIN = 3

export function TextPositionEditor({
  params,
  selectedTextId,
  onSelectText,
  onMoveText,
  onClose,
}: TextPositionEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const scale = 2
  const canvasWidth = params.width * scale
  const canvasHeight = params.height * scale

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const holeMargin = params.screwHoleMargin * scale
    const holeRadius = (params.screwHoleDiameter / 2) * scale
    const corners = [
      { x: holeMargin, y: holeMargin },
      { x: canvasWidth - holeMargin, y: holeMargin },
      { x: holeMargin, y: canvasHeight - holeMargin },
      { x: canvasWidth - holeMargin, y: canvasHeight - holeMargin },
    ]

    ctx.fillStyle = '#d4d4d4'
    for (const corner of corners) {
      ctx.beginPath()
      ctx.arc(corner.x, corner.y, holeRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    params.texts.forEach((text) => {
      const isSelected = text.id === selectedTextId
      const textWidth = text.width * scale
      const textHeight = text.height * scale
      const x = canvasWidth / 2 + text.offsetX * scale - textWidth / 2
      const y = canvasHeight / 2 + text.offsetY * scale - textHeight / 2

      ctx.fillStyle = isSelected ? '#14b8a6' : '#a1a1aa'
      ctx.fillRect(x, y, textWidth, textHeight)

      ctx.strokeStyle = isSelected ? '#0d9488' : '#71717a'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.strokeRect(x, y, textWidth, textHeight)

      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text.content, x + textWidth / 2, y + textHeight / 2)
    })
  }, [params, selectedTextId, canvasWidth, canvasHeight])

  useEffect(() => {
    draw()
  }, [draw])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    for (const text of params.texts) {
      const textWidth = text.width * scale
      const textHeight = text.height * scale
      const textX = canvasWidth / 2 + text.offsetX * scale - textWidth / 2
      const textY = canvasHeight / 2 + text.offsetY * scale - textHeight / 2

      if (x >= textX && x <= textX + textWidth && y >= textY && y <= textY + textHeight) {
        onSelectText(text.id)
        setDragging(text.id)
        setDragStart({ x: e.clientX, y: e.clientY })
        return
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return
    const dx = (e.clientX - dragStart.x) / scale
    const dy = (e.clientY - dragStart.y) / scale

    const text = params.texts.find((t) => t.id === dragging)
    if (!text) return

    const maxOffsetX = params.width / 2 - text.width / 2 - TEXT_MARGIN
    const maxOffsetY = params.height / 2 - text.height / 2 - TEXT_MARGIN

    const newX = Math.max(-maxOffsetX, Math.min(maxOffsetX, text.offsetX + dx))
    const newY = Math.max(-maxOffsetY, Math.min(maxOffsetY, text.offsetY + dy))

    onMoveText(dragging, newX, newY)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Posicionar Textos</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-neutral-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-move border border-neutral-200"
        />
        <p className="mt-2 text-sm text-neutral-500">
          Arraste os textos para reposicionar
        </p>
      </div>
    </div>
  )
}
