import { useCallback, useEffect, useRef, useState } from 'react'
import type { CakeTopperParams } from './schema'

interface TextPositionEditorProps {
  params: CakeTopperParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onMoveText: (id: string, x: number, y: number) => void
  onClose: () => void
}

const TEXT_MARGIN = 3
const SCALE = 2

function plateHalfExtents(params: CakeTopperParams): { halfWidth: number; halfHeight: number } {
  if (params.shape === 'circle') {
    const radius = Math.min(params.width, params.height) / 2
    return { halfWidth: radius, halfHeight: radius }
  }
  return { halfWidth: params.width / 2, halfHeight: params.height / 2 }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
}

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

  const canvasWidth = params.width * SCALE
  const canvasHeight = params.height * SCALE
  const { halfWidth, halfHeight } = plateHalfExtents(params)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2

    ctx.beginPath()
    switch (params.shape) {
      case 'circle':
        ctx.arc(centerX, centerY, halfWidth * SCALE, 0, Math.PI * 2)
        break
      case 'oval':
        ctx.ellipse(centerX, centerY, halfWidth * SCALE, halfHeight * SCALE, 0, 0, Math.PI * 2)
        break
      case 'rounded-rect': {
        const radius = Math.min(params.cornerRadius, halfWidth, halfHeight) * SCALE
        roundRect(ctx, centerX - halfWidth * SCALE, centerY - halfHeight * SCALE, canvasWidth, canvasHeight, radius)
        break
      }
      case 'custom':
        ctx.rect(centerX - halfWidth * SCALE, centerY - halfHeight * SCALE, canvasWidth, canvasHeight)
        break
    }
    ctx.fillStyle = '#e4e4e7'
    ctx.fill()
    ctx.strokeStyle = '#a1a1aa'
    ctx.lineWidth = 1
    ctx.stroke()

    for (const text of params.texts) {
      const isSelected = text.id === selectedTextId
      const textWidth = text.width * SCALE
      const textHeight = text.height * SCALE
      const x = centerX + text.offsetX * SCALE - textWidth / 2
      const y = centerY + text.offsetY * SCALE - textHeight / 2

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
    }
  }, [params, selectedTextId, canvasWidth, canvasHeight, halfWidth, halfHeight])

  useEffect(() => {
    draw()
  }, [draw])

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    for (const text of params.texts) {
      const textWidth = text.width * SCALE
      const textHeight = text.height * SCALE
      const textX = canvasWidth / 2 + text.offsetX * SCALE - textWidth / 2
      const textY = canvasHeight / 2 + text.offsetY * SCALE - textHeight / 2

      if (x >= textX && x <= textX + textWidth && y >= textY && y <= textY + textHeight) {
        onSelectText(text.id)
        setDragging(text.id)
        setDragStart({ x: event.clientX, y: event.clientY })
        return
      }
    }
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return
    const text = params.texts.find((item) => item.id === dragging)
    if (!text) return

    const dx = (event.clientX - dragStart.x) / SCALE
    const dy = (event.clientY - dragStart.y) / SCALE

    const maxOffsetX = Math.max(0, halfWidth - text.width / 2 - TEXT_MARGIN)
    const maxOffsetY = Math.max(0, halfHeight - text.height / 2 - TEXT_MARGIN)
    const newX = Math.max(-maxOffsetX, Math.min(maxOffsetX, text.offsetX + dx))
    const newY = Math.max(-maxOffsetY, Math.min(maxOffsetY, text.offsetY + dy))

    onMoveText(dragging, newX, newY)
    setDragStart({ x: event.clientX, y: event.clientY })
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  return (
    <div
      data-testid="text-editor"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
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
          aria-label="Área de posicionamento de textos"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-move border border-neutral-200"
        />
        <p className="mt-2 text-sm text-neutral-500">Arraste os textos para reposicionar</p>
      </div>
    </div>
  )
}
