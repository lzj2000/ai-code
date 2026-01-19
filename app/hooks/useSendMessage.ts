import type { Message, ToolCall } from '../page'
import { useCallback, useRef } from 'react'

/**
 * 消息发送 Hook 的参数接口
 */
interface UseSendMessageParams {
  sessionId: string // 当前会话 ID
  setIsLoading: (loading: boolean) => void // 设置加载状态
  addUserMessage: (content: string | Array<any>) => Message // 添加用户消息（支持多模态）
  addAssistantMessage: () => Message // 添加 AI 消息
  updateMessageContent: (id: string, content: string, sessionId: string) => void // 更新消息内容
  finishStreaming: (id: string) => void // 完成流式传输
  addErrorMessage: () => void // 添加错误消息
  updateSessionName: (name: string) => void // 更新会话名称
  updateToolCalls: (messageId: string, toolCalls: ToolCall[]) => void // 更新工具调用
  updateToolResult: (messageId: string, toolName: string, output: any) => void // 更新工具结果
  updateToolError: (messageId: string, toolName: string, error: string) => void // 更新工具错误
  modelId: string // 当前选中的模型 ID
}

export function useSendMessage({
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
  modelId,
}: UseSendMessageParams) {
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentRequestIdRef = useRef<number | null>(null)
  const requestSeqRef = useRef(0)
  const activeAssistantMessageIdRef = useRef<string | null>(null)

  const isAbortError = (error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return true
    }
    if (error && typeof error === 'object' && 'name' in error) {
      return (error as { name?: unknown }).name === 'AbortError'
    }
    return false
  }

  const stopGenerating = useCallback(() => {
    const controller = abortControllerRef.current
    if (controller && !controller.signal.aborted) {
      controller.abort()
    }

    abortControllerRef.current = null
    currentRequestIdRef.current = null
    setIsLoading(false)

    const assistantMessageId = activeAssistantMessageIdRef.current
    if (assistantMessageId) {
      finishStreaming(assistantMessageId)
    }
    activeAssistantMessageIdRef.current = null
  }, [finishStreaming, setIsLoading])

  const sendMessage = useCallback(
    async (input: string, selectedTools?: string[], images?: File[]) => {
      stopGenerating()

      const requestId = ++requestSeqRef.current
      currentRequestIdRef.current = requestId
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      setIsLoading(true)

      try {
        // 1. 处理图片：转换为 base64
        let messageContent: string | Array<any> = input
        const imageData: Array<{ data: string, mimeType: string }> = []

        if (images && images.length > 0) {
        // 将图片转换为 base64
          for (const image of images) {
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                const result = reader.result as string
                // 移除 data:image/...;base64, 前缀
                const base64Data = result.split(',')[1]
                resolve(base64Data)
              }
              reader.onerror = reject
              reader.readAsDataURL(image)
            })

            imageData.push({
              data: base64,
              mimeType: image.type,
            })
          }

          // 构建多模态内容数组
          messageContent = [
            { type: 'text', text: input },
            ...imageData.map(img => ({
              type: 'image_url',
              image_url: {
                url: `data:${img.mimeType};base64,${img.data}`,
              },
            })),
          ]
        }

        // 获取模型配置
        // 使用传入的 modelId
        const modelConfig = { modelName: modelId }

        // 2. 添加用户消息（支持多模态）
        addUserMessage(messageContent)

        // 3. 发送请求到 API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            message: messageContent, // 发送文本或多模态内容
            thread_id: sessionId,
            modelConfig,
            selectedTools,
          }),
        })

        if (!response.ok) {
          throw new Error('网络请求失败')
        }

        // 4. 更新会话名称(首次消息)
        updateSessionName(input)

        // 5. 创建 AI 消息占位符
        const assistantMessage = addAssistantMessage()
        if (assistantMessage.id) {
          activeAssistantMessageIdRef.current = assistantMessage.id
        }

        // 6. 处理流式响应
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('无法读取响应流')
        }

        const decoder = new TextDecoder()
        let buffer = '' // 缓冲区,处理跨块的 JSON
        let shouldStop = false

        // 7. 逐块读取响应流
        while (!shouldStop) {
          if (currentRequestIdRef.current !== requestId) {
            shouldStop = true
            break
          }

          const { done, value } = await reader.read()
          if (done)
            break

          // 解码二进制数据为文本
          buffer += decoder.decode(value, { stream: true })

          // 按行分割(每行是一个 JSON 对象)
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留不完整的行到缓冲区

          // 处理每一行
          for (const line of lines) {
            if (currentRequestIdRef.current !== requestId) {
              shouldStop = true
              break
            }

            if (line.trim()) {
              try {
                const data = JSON.parse(line)

                // 处理内容片段
                if (data.type === 'chunk' && data.content) {
                  updateMessageContent(assistantMessage.id!, data.content, sessionId)
                } // 处理工具调用
                else if (data.type === 'tool_calls' && data.tool_calls) {
                  updateToolCalls(assistantMessage.id!, data.tool_calls)
                }
                // 处理工具执行结果
                else if (data.type === 'tool_result' && data.name) {
                  // 兼容新旧格式：优先使用 data.data.output，降级到 data.output
                  const output = data.data?.output ?? data.output

                  updateToolResult(assistantMessage.id!, data.name, output)
                }
                // 处理工具执行错误
                else if (data.type === 'tool_error' && data.name) {
                  console.error('工具执行错误:', data.name, data.error)
                  updateToolError(assistantMessage.id!, data.name, data.error || '未知错误')
                }
                // 流结束
                else if (data.type === 'end') {
                  // 从最终消息中提取工具调用信息(如果有)
                  if (data.message && data.message.tool_calls) {
                    updateToolCalls(assistantMessage.id!, data.message.tool_calls)
                  }
                  finishStreaming(assistantMessage.id!)
                  shouldStop = true
                  break
                }
                // 服务器错误
                else if (data.type === 'error') {
                  console.error('服务器错误:', data.message)
                  throw new Error(data.message || '服务器错误')
                }
              }
              catch (parseError) {
                console.error('解析流数据错误:', parseError)
                if (parseError instanceof Error) {
                  throw parseError
                }
              }
            }
          }
        }
      }
      catch (error) {
        if (isAbortError(error)) {
          const assistantMessageId = activeAssistantMessageIdRef.current
          if (assistantMessageId) {
            finishStreaming(assistantMessageId)
          }
          return
        }

        console.error('发送消息失败:', error)
        // 8. 错误处理
        addErrorMessage()
      }
      finally {
        // 9. 清理加载状态
        if (currentRequestIdRef.current === requestId) {
          setIsLoading(false)
          abortControllerRef.current = null
          currentRequestIdRef.current = null
          activeAssistantMessageIdRef.current = null
        }
      }
    },
    [
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
      modelId,
      stopGenerating,
    ],
  )

  return { sendMessage, stopGenerating }
}
