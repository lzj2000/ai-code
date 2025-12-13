import { useEffect, useCallback } from 'react'
import type { Message } from "../page";


/**
 * 聊天历史加载 Hook
 *
 * 功能:
 * - 自动加载指定会话的历史消息
 * - 当会话 ID 变化时自动重新加载
 * - 解析服务器返回的消息格式
 * - 判断会话是否包含用户消息
 *
 * 使用场景:
 * - 切换到历史会话时加载之前的对话
 * - 刷新页面后恢复当前会话
 *
 * @param sessionId - 当前会话 ID
 * @param onLoadMessages - 加载完成后的回调,接收消息数组
 * @param onHasUserMessage - 设置是否有用户消息的回调
 */
export function useChatHistory(
  sessionId: string,
  onLoadMessages: (messages: Message[]) => void,
  onHasUserMessage: (hasUser: boolean) => void
) {
  /**
   * 加载历史消息
   *
   * 流程:
   * 1. 从 API 获取会话历史
   * 2. 解析 LangGraph 消息格式
   * 3. 转换为应用内部的 Message 格式
   * 4. 更新消息列表和用户消息标记
   *
   * @param threadId - 要加载的会话 ID
   */
  const loadHistory = useCallback(async (threadId: string) => {
    try {
      // 1. 请求历史记录
      const res = await fetch(`/api/chat?thread_id=${threadId}`)
      const data = await res.json()

      if (Array.isArray(data.history) && data.history.length > 0) {
        // 2. 转换 LangGraph 消息格式到应用格式
        const historyMsgs: Message[] = data.history.map((msg: {
          id: string[] | unknown;       // LangGraph 的消息 ID 格式
          kwargs?: { content?: string }; // 消息内容在 kwargs 中
        }, idx: number) => {
          // 3. 根据消息类型判断角色
          let role: 'user' | 'assistant' = 'assistant'

          if (Array.isArray(msg.id) && msg.id.includes('HumanMessage')) {
            role = 'user'  // 用户消息
          } else if (Array.isArray(msg.id) && (msg.id.includes('AIMessage') || msg.id.includes('AIMessageChunk'))) {
            role = 'assistant'  // AI 消息
          }

          // 4. 构造标准化的消息对象
          return {
            id: String(idx + 1),              // 使用索引作为 ID
            content: msg.kwargs?.content || '', // 提取消息内容
            role,
            timestamp: new Date()              // 使用当前时间作为时间戳
          }
        })

        // 5. 更新消息列表
        onLoadMessages(historyMsgs)

        // 6. 检查是否有用户消息(用于判断是否需要更新会话名)
        onHasUserMessage(historyMsgs.some(msg => msg.role === 'user'))
      } else {
        // 没有历史记录,重置为初始状态
        onLoadMessages([])
        onHasUserMessage(false)
      }
    } catch {
      // 静默失败,不影响用户体验
      // 加载失败时也重置为初始状态
      onLoadMessages([])
      onHasUserMessage(false)
    }
  }, [onLoadMessages, onHasUserMessage])

  // 当 sessionId 变化时自动加载历史记录
  useEffect(() => {
    loadHistory(sessionId)
  }, [sessionId, loadHistory])

  return { loadHistory }
}
