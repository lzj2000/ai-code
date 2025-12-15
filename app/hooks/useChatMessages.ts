import type { Message } from '../page'
import { useCallback, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

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
   * 添加用户消息
   * @param content - 消息内容
   * @returns 创建的消息对象
   */
  const addUserMessage = useCallback((content: string): Message => {
    const userMessage: Message = {
      id: uuidv4(), // 使用 UUID
      content,
      role: 'user',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    return userMessage
  }, [])

  /**
   * 添加 AI 助手消息
   * 创建一个空的流式消息,用于后续逐步填充内容
   * @returns 创建的消息对象
   */
  const addAssistantMessage = useCallback((): Message => {
    const assistantMessage: Message = {
      id: uuidv4(), // 使用 UUID
      content: '', // 初始为空,等待流式填充
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true, // 标记为流式传输中
    }
    setMessages(prev => [...prev, assistantMessage])
    return assistantMessage
  }, [])

  /**
   * 更新消息内容(用于流式响应)
   * 将新内容追加到指定消息的末尾
   * @param messageId - 消息 ID
   * @param content - 要追加的内容
   */
  const updateMessageContent = useCallback(
    (messageId: string, content: string) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: msg.content + content }
            : msg,
        ),
      )
    },
    [],
  )

  /**
   * 完成流式传输
   * 将消息标记为完成,移除流式打字光标
   * @param messageId - 消息 ID
   */
  const finishStreaming = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, isStreaming: false } : msg,
      ),
    )
  }, [])

  /**
   * 添加错误消息
   * 在发生错误时向用户显示友好的错误提示
   * @param content - 错误内容
   */
  const addErrorMessage = useCallback((content: string = '抱歉，发送消息时出现错误。请稍后重试。') => {
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      content,
      role: 'assistant',
      timestamp: new Date(),
    }
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
  }
}
