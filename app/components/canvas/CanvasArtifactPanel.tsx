'use client'

import type { CanvasArtifact, CanvasStatus } from '../../canvas/canvas-types'
import { Check, Copy, Download, Eye, Monitor, RectangleHorizontal, Smartphone, Tablet, Terminal, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildVirtualProjectFiles } from '../../canvas/virtual-project'
import { CodePreviewPanel } from './CodePreviewPanel'

/**
 * Artifact 面板入参
 */
interface CanvasArtifactPanelProps {
  /** 当前选中的 artifact */
  artifact: CanvasArtifact
}

/**
 * 面板顶部 tab
 */
type TabKeyLite = 'preview' | 'code'

/**
 * 预览视口类型（用于控制预览宽度）
 */
type Viewport = 'desktop' | 'tablet' | 'phone'

/**
 * 单个 Artifact 的展示面板
 *
 * 职责：
 * - 展示标题/状态
 * - 顶部操作（切换 tab、切换视口、导出）
 * - 渲染预览 iframe 或代码文本
 */
export function CanvasArtifactPanel({ artifact }: CanvasArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKeyLite>('preview')
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])
  const [executionError, setExecutionError] = useState('')
  const [status, setStatus] = useState<CanvasStatus>(artifact.status)
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [viewportMenuOpen, setViewportMenuOpen] = useState(false)
  const [showConsole, setShowConsole] = useState(false)
  const [consoleFilter, setConsoleFilter] = useState('')
  // 用 ref 做“点外部关闭”，避免把事件绑定到每个子节点上
  const viewportMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setStatus(artifact.status)
  }, [artifact.id, artifact.status])

  useEffect(() => {
    setActiveTab('preview')
    setConsoleOutput([])
    setExecutionError('')
    setShowConsole(false)
    setConsoleFilter('')
    setViewportMenuOpen(false)
  }, [artifact.id])

  useEffect(() => {
    if (activeTab !== 'preview')
      setShowConsole(false)
  }, [activeTab])

  const handleStatusChange = useCallback((nextStatus: CanvasStatus) => {
    setStatus(nextStatus)
  }, [])

  const handleError = useCallback((error: string) => {
    setExecutionError(error)
    setActiveTab('code')
  }, [])

  const filteredConsoleOutput = useMemo(() => {
    const keyword = consoleFilter.trim()
    if (!keyword)
      return consoleOutput
    return consoleOutput.filter(line => line.toLowerCase().includes(keyword.toLowerCase()))
  }, [consoleFilter, consoleOutput])

  const statusText = useMemo(() => {
    if (artifact.isStreaming)
      return '生成中'
    if (status === 'executing')
      return '执行中'
    if (status === 'ready')
      return '已就绪'
    if (status === 'error')
      return '执行失败'
    return '创建中'
  }, [artifact.isStreaming, status])

  const iconButtonClass = (isActive: boolean) => {
    const base = 'inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors'
    if (isActive)
      return `${base} bg-slate-800 border-slate-700 text-slate-100`
    return `${base} bg-transparent border-slate-800 text-slate-300 hover:bg-slate-900`
  }

  const dropdownButtonClass = (isActive: boolean) => {
    const base = 'inline-flex h-8 items-center gap-1.5 rounded-md border px-2 transition-colors'
    if (isActive)
      return `${base} bg-slate-800 border-slate-700 text-slate-100`
    return `${base} bg-transparent border-slate-800 text-slate-300 hover:bg-slate-900`
  }

  const handleCopyConsole = useCallback(async () => {
    const text = filteredConsoleOutput.join('\n')
    if (!text)
      return
    try {
      await navigator.clipboard.writeText(text)
    }
    catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }, [filteredConsoleOutput])

  useEffect(() => {
    if (!viewportMenuOpen)
      return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target)
        return
      if (viewportMenuRef.current?.contains(target))
        return
      // 点击菜单以外区域即关闭，避免遮挡顶部按钮区的其它交互
      setViewportMenuOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
        // Esc 关闭下拉，保证键盘可达性
        setViewportMenuOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [viewportMenuOpen])

  return (
    <div className="w-full h-full overflow-hidden bg-[#0B1220] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-100 truncate">
            {artifact.title}
          </div>
          <div className="text-[11px] text-slate-400">
            {statusText}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={iconButtonClass(activeTab === 'preview')}
            onClick={() => setActiveTab('preview')}
            title="浏览"
            aria-label="浏览"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className={iconButtonClass(activeTab === 'code')}
            onClick={() => setActiveTab('code')}
            title="Code"
            aria-label="Code"
          >
            <RectangleHorizontal className="w-3.5 h-3.5" />
          </button>
          {activeTab === 'preview' && (
            <button
              type="button"
              className={iconButtonClass(showConsole)}
              onClick={() => setShowConsole(prev => !prev)}
              title="Console"
              aria-label="Console"
            >
              <Terminal className="w-3.5 h-3.5" />
            </button>
          )}
          <div ref={viewportMenuRef} className="relative">
            <button
              type="button"
              className={dropdownButtonClass(viewportMenuOpen)}
              onClick={() => setViewportMenuOpen(prev => !prev)}
              title="切换视口"
              aria-label="切换视口"
            >
              {viewport === 'desktop'
                ? <Monitor className="h-4 w-4" />
                : viewport === 'tablet'
                  ? <Tablet className="h-4 w-4" />
                  : <Smartphone className="h-4 w-4" />}
            </button>

            {viewportMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-md border border-slate-700 bg-slate-950 shadow-lg z-20">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
                  onClick={() => {
                    setViewport('desktop')
                    setViewportMenuOpen(false)
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </span>
                  {viewport === 'desktop' && <Check className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
                  onClick={() => {
                    setViewport('tablet')
                    setViewportMenuOpen(false)
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Tablet className="h-4 w-4" />
                    Tablet
                  </span>
                  {viewport === 'tablet' && <Check className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
                  onClick={() => {
                    setViewport('phone')
                    setViewportMenuOpen(false)
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Phone
                  </span>
                  {viewport === 'phone' && <Check className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-800 text-slate-300 hover:bg-slate-900 transition-colors"
            onClick={() => {
              // 导出为“虚拟工程文件集合”，便于用户在本地快速落地运行/调试
              const files = buildVirtualProjectFiles(artifact)
              const content = files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')
              const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${artifact.title || 'canvas-artifact'}.txt`
              a.click()
              URL.revokeObjectURL(url)
            }}
            title="导出"
            aria-label="导出"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {/* 使用 min-h-0 让内部滚动区域在 flex 容器中正常收缩 */}
        <div className="h-full flex flex-col bg-[#020617]">
          <div className="flex-1 min-h-0 flex items-stretch justify-center">
            <CodePreviewPanel
              code={artifact.code.content}
              artifact={artifact}
              activeTab={activeTab}
              viewport={viewport}
              executionError={executionError}
              onStatusChange={handleStatusChange}
              onConsoleOutput={setConsoleOutput}
              onError={handleError}
            />
          </div>

          {activeTab === 'preview' && showConsole && (
            <div className="h-56 bg-white border-t border-slate-200">
              <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200">
                <div className="text-sm font-medium text-slate-800">
                  Console
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={consoleFilter}
                    onChange={e => setConsoleFilter(e.target.value)}
                    placeholder="Filter..."
                    className="h-7 w-44 rounded-md border border-slate-200 px-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleCopyConsole}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    title="复制"
                    aria-label="复制"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsoleOutput([])}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    title="清空"
                    aria-label="清空"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConsole(false)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    title="关闭"
                    aria-label="关闭"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="h-[calc(100%-2.5rem)] overflow-auto px-3 py-4">
                {filteredConsoleOutput.length === 0
                  ? (
                      <div className="h-full flex items-start justify-center pt-10 text-sm text-slate-500">
                        No logs available to display
                      </div>
                    )
                  : (
                      <div className="space-y-1 font-mono text-xs text-slate-800">
                        {filteredConsoleOutput.map((line, index) => (
                          <div key={index} className="whitespace-pre-wrap break-words">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
