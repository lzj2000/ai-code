'use client'

import type { BaseMessage } from '@langchain/core/messages'
import type { CanvasArtifact } from './canvas/canvas-types'
import type { Tool } from './components/tool-selector'

import { useEffect, useMemo, useRef, useState } from 'react'
import { unifiedToolsConfig } from './agent/config/tools.config'
import { DEFAULT_MODEL_ID } from './agent/utils/models'

import ProtectedRoute from './components/auth/ProtectedRoute'
import { CanvasDock } from './components/canvas/CanvasDock'
// 导入组件
import ChatHeader from './components/chat-header'
import ChatInput from './components/chat-input'
import ChatMessage from './components/chat-message'
import Sidebar from './components/sidebar'

import { useChatHistory } from './hooks/useChatHistory'
import { useChatMessages } from './hooks/useChatMessages'
// 导入自定义 Hooks
import { useSendMessage } from './hooks/useSendMessage'
import { useSessionManager } from './hooks/useSessionManager'

export interface ToolCall {
  id: string
  name: string
  args: Record<string, any>
  output?: any
  error?: string
}

export interface Message extends BaseMessage {
  isStreaming?: boolean
  tool_calls?: ToolCall[]
  toolCallResults?: ToolCall[]
  artifacts?: CanvasArtifact[]
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID)
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null)
  const [canvasOpen, setCanvasOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 初始化加载模型选择
  useEffect(() => {
    const savedModelId = localStorage.getItem('selectedModelId')
    if (savedModelId) {
      setSelectedModelId(savedModelId)
    }
  }, [])

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId)
    localStorage.setItem('selectedModelId', modelId)
  }

  // ==================== 消息管理 ====================
  // 使用 useChatMessages hook 管理所有消息相关的状态和方法
  const {
    messages, // 当前会话的所有消息
    isLoading, // 是否正在加载(发送消息中)
    setIsLoading, // 设置加载状态
    addUserMessage, // 添加用户消息
    addAssistantMessage, // 添加 AI 助手消息
    updateMessageContent, // 更新消息内容(用于流式响应)
    finishStreaming, // 完成流式传输
    addErrorMessage, // 添加错误消息
    loadMessages, // 加载历史消息
    updateToolCalls, // 更新工具调用
    updateToolResult, // 更新工具执行结果
    updateToolError, // 更新工具执行错误
  } = useChatMessages()

  // ==================== 会话管理 ====================
  // 使用 useSessionManager hook 管理会话(session)相关状态
  const {
    sessionId, // 当前会话 ID
    sidebarRef, // 侧边栏组件引用
    createNewSession, // 创建新会话
    selectSession, // 切换会话
    updateSessionName, // 更新会话名称
    setHasUserMessage, // 设置是否有用户消息(用于判断是否需要更新会话名)
  } = useSessionManager()

  // ==================== 历史记录加载 ====================
  // 使用 useChatHistory hook 自动加载会话历史
  // 当 sessionId 变化时,会自动触发历史记录加载
  useChatHistory(sessionId, loadMessages, setHasUserMessage)

  // ==================== 消息发送 ====================
  // 使用 useSendMessage hook 处理消息发送逻辑
  const { sendMessage } = useSendMessage({
    sessionId,
    setIsLoading,
    addUserMessage,
    addAssistantMessage,
    updateMessageContent,
    finishStreaming,
    addErrorMessage,
    updateSessionName,
    updateToolCalls,
    updateToolResult,
    updateToolError,
    modelId: selectedModelId,
  })

  // ==================== 工具配置 ====================
  // 将后端工具配置转换为前端 Tool 格式
  const availableTools = useMemo<Tool[]>(() => {
    return unifiedToolsConfig
      .filter(tool => tool.enabled)
      .map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        icon: tool.icon || '⚙',
      }))
  }, [])

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    setActiveArtifactId(null)
    setCanvasOpen(false)
  }, [sessionId])

  const allArtifacts = useMemo<CanvasArtifact[]>(() => {
    const list: CanvasArtifact[] = []
    messages.forEach((msg) => {
      if (msg.artifacts && msg.artifacts.length > 0) {
        list.push(...msg.artifacts)
      }
    })
    return list
  }, [messages])

  // ==================== 渲染 UI ====================
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        {/* 侧边栏 */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isCollapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          ref={sidebarRef}
          currentSessionId={sessionId}
          onSelect={selectSession}
          onNew={createNewSession}
        />

        {/* 主聊天区域 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* 头部 */}
          <ChatHeader
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* 对话区（消息 + 输入）与 Canvas 侧栏并排 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 左侧：消息 + 输入（同一个列，保证高度包含输入框） */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 消息容器 */}
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col space-y-4 p-4 md:p-6">
                  {messages.length === 0
                    ? (
                        <div className="flex h-full min-h-[60vh] flex-col items-center justify-center">
                          <h2 className="mb-2 text-lg font-medium text-foreground">
                            有什么可以帮你？
                          </h2>
                          <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
                            我是你的AI助手，可以回答问题、提供建议或帮你完成各种任务
                          </p>
                          {/* 快捷提示 */}
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {['写一首诗', '解释代码', '头脑风暴'].map((text, index) => (
                              <button
                                key={index}
                                onClick={() => sendMessage(text)}
                                className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-card-foreground transition-colors hover:bg-accent active:scale-[0.98]"
                              >
                                {text}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    : (
                        <>
                          {messages.map((message: Message) => (
                            <ChatMessage
                              key={message.id}
                              message={message}
                              onFocusArtifact={(artifactId) => {
                                setActiveArtifactId(artifactId)
                                setCanvasOpen(true)
                              }}
                            />
                          ))}
                          {/* 加载状态 */}
                          {isLoading && (
                            <div className="flex items-start gap-3">
                              <div className="rounded-2xl rounded-bl-sm bg-card border border-border px-4 py-3">
                                <div className="flex gap-1">
                                  <div
                                    className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                                    style={{ animationDelay: '0ms' }}
                                  >
                                  </div>
                                  <div
                                    className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                                    style={{ animationDelay: '150ms' }}
                                  >
                                  </div>
                                  <div
                                    className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                                    style={{ animationDelay: '300ms' }}
                                  >
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                </div>
              </div>

              {/* 输入区域 */}
              <ChatInput
                availableTools={availableTools}
                onSendMessage={sendMessage}
                isLoading={isLoading}
                selectedModelId={selectedModelId}
                onModelChange={handleModelChange}
              />
            </div>

            {/* 右侧：Canvas 侧栏（高度对齐消息 + 输入） */}
            {allArtifacts.length > 0 && (
              <div className="hidden lg:flex">
                <CanvasDock
                  artifacts={allArtifacts}
                  activeArtifactId={activeArtifactId}
                  isOpen={canvasOpen}
                  onToggleOpen={() => setCanvasOpen(prev => !prev)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
