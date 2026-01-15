'use client'

import type React from 'react'
import type { CanvasArtifact } from '../../canvas/canvas-types'
import { ChevronsLeft } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { CanvasArtifactPanel } from './CanvasArtifactPanel'

/**
 * Canvas 侧栏容器
 *
 * 职责：
 * - 展示当前聚焦的 Artifact 面板
 * - 支持侧栏展开/收起与拖拽调宽
 */
interface CanvasDockProps {
  /** 当前会话下的所有 artifacts */
  artifacts: CanvasArtifact[]
  /** 当前聚焦的 artifact key（由消息卡片触发，避免跨消息 id 冲突） */
  activeArtifactKey: string | null
  /** 侧栏是否展开 */
  isOpen: boolean
  /** 切换展开/收起 */
  onToggleOpen: () => void
}

/**
 * 可拖拽调整宽度的 Canvas 侧栏
 */
export function CanvasDock({
  artifacts,
  activeArtifactKey,
  isOpen,
  onToggleOpen,
}: CanvasDockProps) {
  const [dockWidth, setDockWidth] = useState(520)
  const [dragging, setDragging] = useState(false)
  const dockRef = useRef<HTMLDivElement | null>(null)
  // 用 requestAnimationFrame 合并高频拖拽事件，避免每次 mousemove 都触发同步布局
  const rafIdRef = useRef<number | null>(null)
  // 拖拽过程中暂存“下一帧要应用”的宽度，抬手时再落盘到 state
  const pendingWidthRef = useRef<number | null>(null)
  const dragStartXRef = useRef<number | null>(null)
  const dragStartWidthRef = useRef<number | null>(null)
  const pointerIdRef = useRef<number | null>(null)

  const clampWidth = useCallback((value: number) => {
    // 限制可拖拽宽度范围，避免挤压主聊天区域或产生不可用的极窄侧栏
    const min = 360
    const max = 960
    return Math.min(max, Math.max(min, value))
  }, [])

  const finalizeResize = useCallback(() => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    setDragging(false)

    const finalWidth = pendingWidthRef.current ?? dockWidth
    setDockWidth(finalWidth)

    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    pendingWidthRef.current = null
    dragStartXRef.current = null
    dragStartWidthRef.current = null
    pointerIdRef.current = null
  }, [dockWidth])

  const handleResizerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOpen)
      return

    e.preventDefault()
    setDragging(true)

    dragStartXRef.current = e.clientX
    dragStartWidthRef.current = dockWidth
    pointerIdRef.current = e.pointerId
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [dockWidth, isOpen])

  const handleResizerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging)
      return
    if (pointerIdRef.current !== e.pointerId)
      return

    const startX = dragStartXRef.current
    const startWidth = dragStartWidthRef.current
    if (startX == null || startWidth == null)
      return

    const nextWidth = clampWidth(startWidth + (startX - e.clientX))
    pendingWidthRef.current = nextWidth
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (pendingWidthRef.current != null && dockRef.current) {
          dockRef.current.style.width = `${pendingWidthRef.current}px`
        }
        rafIdRef.current = null
      })
    }
  }, [clampWidth, dragging])

  const handleResizerPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId)
      return

    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    catch {}
    finalizeResize()
  }, [finalizeResize])

  const getArtifactKey = useCallback((artifact: CanvasArtifact) => {
    return `${artifact.sessionId}:${artifact.messageId}:${artifact.id}`
  }, [])

  const activeArtifact = useMemo(() => {
    if (!activeArtifactKey)
      return null
    return artifacts.find(a => getArtifactKey(a) === activeArtifactKey) || null
  }, [activeArtifactKey, artifacts, getArtifactKey])

  return (
    <div
      ref={dockRef}
      className={`relative h-full border-l border-border bg-background ${dragging ? '' : 'transition-[width] duration-200'}`}
      style={{ width: isOpen ? dockWidth : 48 }}
    >
      {isOpen && (
        <div
          role="separator"
          aria-orientation="vertical"
          onPointerDown={handleResizerPointerDown}
          onPointerMove={handleResizerPointerMove}
          onPointerUp={handleResizerPointerUp}
          onPointerCancel={handleResizerPointerUp}
          className="absolute left-0 top-0 h-full w-2 cursor-col-resize hover:bg-slate-500/20 z-30 touch-none"
        />
      )}
      <div className="h-full flex flex-col">
        {isOpen
          ? (
              <div className="flex-1 overflow-hidden">
                {artifacts.length === 0
                  ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        还没有生成 Artifact
                      </div>
                    )
                  : (
                      <div className="h-full overflow-hidden">
                        {activeArtifact
                          ? (
                              <CanvasArtifactPanel
                                artifact={activeArtifact}
                                onToggleDock={onToggleOpen}
                              />
                            )
                          : (
                              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                点击消息中的代码卡片打开产物
                              </div>
                            )}
                      </div>
                    )}
              </div>
            )
          : (
              <div className="h-full flex flex-col items-center justify-start p-2">
                <button
                  type="button"
                  onClick={onToggleOpen}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card hover:bg-accent transition-colors"
                  aria-label="展开 Canvas"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
              </div>
            )}
      </div>
    </div>
  )
}
