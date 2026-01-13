'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { CanvasArtifact, CanvasStatus } from '../../canvas/canvas-types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { generateIframeHTML, sanitizeCode } from '../../canvas/preview-utils'

/**
 * 代码预览面板入参
 */
interface CodePreviewPanelProps {
  /** 组件代码（期望包含 export default） */
  code: string
  /** 当前 artifact（用于判断流式状态、作为 key 等） */
  artifact: CanvasArtifact
  /** 面板当前激活区：预览 / 代码 */
  activeTab: 'preview' | 'code'
  /** 预览视口（由外层面板统一管理） */
  viewport?: Viewport
  /** 执行错误信息（用于 code tab 顶部提示） */
  executionError: string
  /** 通知外层状态变更（streaming / executing / ready / error） */
  onStatusChange: (status: CanvasStatus) => void
  /** 通知外层更新控制台日志（推荐直接传 setState，避免消息密集时丢日志） */
  onConsoleOutput: Dispatch<SetStateAction<string[]>>
  /** 通知外层出现执行错误 */
  onError: (error: string) => void
}

/**
 * 预览视口类型
 * - desktop：全宽
 * - tablet：固定宽度模拟平板
 * - phone：固定宽度模拟手机
 */
type Viewport = 'desktop' | 'tablet' | 'phone'

/**
 * 代码预览面板
 *
 * 通过 iframe srcdoc 执行用户 JSX，并通过 postMessage 将 ready/console/error 回传给父页面。
 */
export function CodePreviewPanel({
  code,
  artifact,
  activeTab,
  viewport = 'desktop',
  executionError,
  onStatusChange,
  onConsoleOutput,
  onError,
}: CodePreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isReady, setIsReady] = useState(false)

  const viewportWidthClass = useMemo(() => {
    if (viewport === 'tablet')
      return 'w-[768px]'
    if (viewport === 'phone')
      return 'w-[390px]'
    return 'w-full'
  }, [viewport])

  // 监听来自 iframe 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow
      if (!iframeWindow || event.source !== iframeWindow)
        return

      const data = event.data
      if (!data || typeof data !== 'object')
        return

      if (data.type === 'canvas:ready') {
        // 清除超时定时器
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        setIsReady(true)
        onStatusChange('ready')
      }
      else if (data.type === 'canvas:console') {
        onConsoleOutput(prev => [...prev, `[${data.level}] ${data.message}`].slice(-50)) // 保留最近 50 条
      }
      else if (data.type === 'canvas:error') {
        onStatusChange('error')
        onError(data.error)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onStatusChange, onConsoleOutput, onError])

  // 更新 iframe 内容
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe)
      return

    if (activeTab !== 'preview')
      return

    // 如果还在流式传输中，不执行代码
    if (artifact.isStreaming) {
      onStatusChange('streaming')
      return
    }

    // 检查代码是否包含 export default（避免执行不完整的代码）
    if (!code.includes('export default')) {
      onStatusChange('streaming')
      return
    }

    // 清除之前的超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setIsReady(false)
    onStatusChange('executing')

    const { sanitized: sanitizedCode, icons } = sanitizeCode(code)
    const html = generateIframeHTML(sanitizedCode, icons)

    iframe.srcdoc = html

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [activeTab, code, artifact.id, artifact.isStreaming, onStatusChange, onError])

  const renderContent = () => {
    switch (activeTab) {
      case 'preview':
        return (
          <div className="flex-1 bg-muted flex items-stretch justify-center overflow-hidden">
            <div
              className={`relative h-full ${viewportWidthClass} ${viewport === 'desktop' ? '' : 'overflow-hidden'}`}
            >
              <iframe
                key={artifact.id}
                ref={iframeRef}
                sandbox="allow-scripts allow-modals"
                className="w-full h-full border-0 block"
                title="Canvas Preview"
              />
              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">正在渲染...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'code':
        return (
          <div className="h-full bg-muted p-3">
            <div className="h-full w-full rounded-lg bg-background border border-border overflow-y-auto overflow-x-hidden">
              {executionError && (
                <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-2">
                  <pre className="text-xs text-destructive font-mono whitespace-pre-wrap break-words">
                    {executionError}
                  </pre>
                </div>
              )}
              <pre className="text-xs text-foreground font-mono p-3 whitespace-pre-wrap break-words">
                {code}
              </pre>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {renderContent()}
    </div>
  )
}
