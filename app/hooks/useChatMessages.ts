import type { CanvasArtifact } from '../canvas/canvas-types'
import type { Message, ToolCall } from '../page'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { useCallback, useState } from 'react'
import { getCanvasParser } from '../canvas/CanvasArtifactParser'

function normalizeToolName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

/**
 * 初始欢迎消息
 * 在新会话开始时显示给用户
 */
export function useChatMessages() {
  // 消息列表状态,默认为空 (不再显示初始欢迎消息)
  const [messages, setMessages] = useState<Message[]>([])
  // 加载状态,标识是否正在发送/接收消息
  const [isLoading, setIsLoading] = useState(false)

  /**
   * 添加用户消息（使用 LangChain HumanMessage）
   * @param content - 消息内容（文本或多模态内容数组）
   * @returns 创建的消息对象
   */
  const addUserMessage = useCallback((content: string | Array<any>): Message => {
    const userMessage = new HumanMessage({
      content,
      id: Date.now().toString(),
    }) as Message
    setMessages(prev => [...prev, userMessage])
    return userMessage
  }, [])

  /**
   * 添加 AI 助手消息（使用 LangChain AIMessage）
   * 创建一个空的流式消息,用于后续逐步填充内容
   * @returns 创建的消息对象
   */
  const addAssistantMessage = useCallback((): Message => {
    const assistantMessage = new AIMessage({
      content: '', // 初始为空,等待流式填充
      id: (Date.now() + 1).toString(),
    }) as Message
    assistantMessage.isStreaming = true // 标记为流式传输中
    setMessages(prev => [...prev, assistantMessage])
    return assistantMessage
  }, [])

  /**
   * 使用 Canvas 解析器解析新增内容，生成或更新 Artifact
   */
  const parseArtifactsFromChunk = useCallback(
    (messageId: string, sessionId: string, chunk: string) => {
      const parser = getCanvasParser()

      const patchOrder: string[] = []
      const patchByArtifactId = new Map<
        string,
        Array<(current: CanvasArtifact | undefined) => CanvasArtifact>
      >()

      const enqueuePatch = (
        artifactId: string,
        step: (current: CanvasArtifact | undefined) => CanvasArtifact,
      ) => {
        if (!patchByArtifactId.has(artifactId)) {
          patchByArtifactId.set(artifactId, [])
          patchOrder.push(artifactId)
        }
        patchByArtifactId.get(artifactId)!.push(step)
      }

      parser.setCallbacks({
        onArtifactStart: (metadata) => {
          const now = new Date()
          enqueuePatch(metadata.id, (current) => {
            if (current) {
              return {
                ...current,
                title: metadata.title,
                type: metadata.type,
                status: 'creating',
                isStreaming: true,
                updatedAt: now,
              }
            }

            return {
              id: metadata.id,
              type: metadata.type,
              title: metadata.title,
              project: { entryPath: '', files: [] },
              status: 'creating',
              isStreaming: true,
              messageId,
              sessionId,
              currentVersion: 1,
              createdAt: now,
              updatedAt: now,
            }
          })
        },
        onFileUpdate: (data) => {
          const now = new Date()
          enqueuePatch(data.artifactId, (current) => {
            const base: CanvasArtifact = current || {
              id: data.artifactId,
              type: 'react',
              title: data.artifactId,
              project: { entryPath: '', files: [] },
              status: 'creating',
              isStreaming: true,
              messageId,
              sessionId,
              currentVersion: 1,
              createdAt: now,
              updatedAt: now,
            }

            const existingFiles = base.project.files
            const idx = existingFiles.findIndex(f => f.path === data.path)
            const nextFiles = [...existingFiles]
            const nextFile = { path: data.path, language: data.language, content: data.content }
            if (idx === -1)
              nextFiles.push(nextFile)
            else
              nextFiles[idx] = nextFile

            return {
              ...base,
              project: { ...base.project, files: nextFiles },
              status: 'streaming',
              isStreaming: true,
              updatedAt: now,
            }
          })
        },
        onArtifactComplete: (artifact) => {
          const now = new Date()
          enqueuePatch(artifact.id, (current) => {
            const base: CanvasArtifact = current || {
              id: artifact.id,
              type: artifact.type,
              title: artifact.title,
              project: artifact.project,
              config: artifact.config,
              status: 'creating',
              isStreaming: true,
              messageId,
              sessionId,
              currentVersion: 1,
              createdAt: now,
              updatedAt: now,
            }

            return {
              ...base,
              type: artifact.type,
              title: artifact.title,
              project: artifact.project,
              config: artifact.config,
              status: 'ready',
              isStreaming: false,
              currentVersion: base.currentVersion + 1,
              updatedAt: now,
            }
          })
        },
      })

      parser.parse(messageId, chunk)

      return { patchOrder, patchByArtifactId }
    },
    [],
  )

  /**
   * 更新消息内容(用于流式响应)
   * 将新内容追加到指定消息的末尾
   * @param messageId - 消息 ID
   * @param content - 要追加的内容
   * @param sessionId - 当前会话 ID（用于 Artifact 关联）
   */
  const updateMessageContent = useCallback(
    (messageId: string, content: string, sessionId: string) => {
      const patch = parseArtifactsFromChunk(messageId, sessionId, content)

      setMessages(prev => prev.map((msg) => {
        if (msg.id === messageId) {
          const currentContent = typeof msg.content === 'string' ? msg.content : ''
          const existingArtifacts = msg.artifacts || []
          const byId = new Map(existingArtifacts.map(a => [a.id, a] as const))
          const order = existingArtifacts.map(a => a.id)
          const orderSet = new Set(order)

          for (const artifactId of patch.patchOrder) {
            const steps = patch.patchByArtifactId.get(artifactId)
            if (!steps || steps.length === 0)
              continue

            let nextArtifact: CanvasArtifact | undefined = byId.get(artifactId)
            for (const step of steps) {
              nextArtifact = step(nextArtifact)
            }
            if (nextArtifact) {
              byId.set(artifactId, nextArtifact)
              if (!orderSet.has(artifactId)) {
                orderSet.add(artifactId)
                order.push(artifactId)
              }
            }
          }

          const nextArtifacts = order
            .map(id => byId.get(id))
            .filter(Boolean) as CanvasArtifact[]

          const updatedMessage = new AIMessage({
            content: currentContent + content,
            id: msg.id,
          }) as Message
          updatedMessage.isStreaming = msg.isStreaming
          updatedMessage.toolCallResults = msg.toolCallResults
          updatedMessage.tool_calls = msg.tool_calls
          updatedMessage.artifacts = nextArtifacts
          return updatedMessage
        }
        return msg
      }))
    },
    [parseArtifactsFromChunk],
  )

  /**
   * 完成流式传输
   * 将消息标记为完成,移除流式打字光标
   * @param messageId - 消息 ID
   */
  const finishStreaming = useCallback((messageId: string) => {
    setMessages(prev => prev.map((msg) => {
      if (msg.id === messageId) {
        // 创建新对象以确保 React 检测到变化，保留所有属性
        const updated = {
          ...msg,
          isStreaming: false,
        } as Message

        return updated
      }
      return msg
    }))
  }, [])

  /**
   * 添加错误消息
   * 在发生错误时向用户显示友好的错误提示
   */
  const addErrorMessage = useCallback(() => {
    const errorMessage = new AIMessage({
      content: '抱歉，发送消息时出现错误。请稍后重试。',
      id: (Date.now() + 1).toString(),
    }) as Message
    setMessages(prev => [...prev, errorMessage])
  }, [])

  /**
   * 重置消息列表
   * 恢复到初始状态(空)
   */
  const resetMessages = useCallback(() => {
    setMessages([])
  }, [])

  /**
   * 更新消息的工具调用信息
   * @param messageId - 消息 ID
   * @param toolCalls - 工具调用数组
   */
  const updateToolCalls = useCallback((messageId: string, toolCalls: ToolCall[]) => {
    setMessages(prev => prev.map((msg) => {
      if (msg.id === messageId) {
        const updatedMsg = { ...msg, toolCallResults: toolCalls } as Message
        return updatedMsg
      }
      return msg
    }))
  }, [])

  /**
   * 添加工具调用到消息
   * @param messageId - 消息 ID
   * @param toolCall - 要添加的工具调用
   */
  const addToolCall = useCallback((messageId: string, toolCall: ToolCall) => {
    setMessages(prev => prev.map((msg) => {
      if (msg.id === messageId) {
        const existing = msg.toolCallResults || []
        const updatedMsg = {
          ...msg,
          toolCallResults: [...existing, toolCall],
        } as Message
        return updatedMsg
      }
      return msg
    }))
  }, [])

  /**
   * 更新工具调用结果
   * @param messageId - 消息 ID
   * @param toolName - 工具名称
   * @param output - 工具输出结果
   */
  const updateToolResult = useCallback((messageId: string, toolName: string, output: any) => {
    setMessages(prev => prev.map((msg) => {
      if (msg.id === messageId) {
        const toolCalls = msg.toolCallResults || []
        const normalizedIncomingName = normalizeToolName(toolName)
        const updatedToolCalls = toolCalls.map((tc) => {
          const isSameTool
            = tc.name === toolName || normalizeToolName(tc.name) === normalizedIncomingName
          return isSameTool ? { ...tc, output } : tc
        })
        return { ...msg, toolCallResults: updatedToolCalls } as Message
      }
      return msg
    }))
  }, [])

  /**
   * 更新工具调用错误
   * @param messageId - 消息 ID
   * @param toolName - 工具名称
   * @param error - 错误信息
   */
  const updateToolError = useCallback((messageId: string, toolName: string, error: string) => {
    setMessages(prev => prev.map((msg) => {
      if (msg.id === messageId) {
        const toolCalls = msg.toolCallResults || []
        const normalizedIncomingName = normalizeToolName(toolName)
        const updatedToolCalls = toolCalls.map((tc) => {
          const isSameTool
            = tc.name === toolName || normalizeToolName(tc.name) === normalizedIncomingName
          return isSameTool ? { ...tc, error } : tc
        })
        return { ...msg, toolCallResults: updatedToolCalls } as Message
      }
      return msg
    }))
  }, [])

  /**
   * 加载历史消息
   * 用于从服务器加载会话历史记录
   * @param historyMessages - 历史消息数组
   */
  const loadMessages = useCallback((historyMessages: Message[]) => {
    setMessages(historyMessages.length > 0 ? historyMessages : [])
  }, [])

  return {
    messages,
    isLoading,
    setIsLoading,
    addUserMessage,
    addAssistantMessage,
    updateMessageContent,
    finishStreaming,
    addErrorMessage,
    resetMessages,
    loadMessages,
    updateToolCalls,
    addToolCall,
    updateToolResult,
    updateToolError,
  }
}
