import type { ChatHistoryQuery, ChatHistoryResult, ChatMessageInput } from './types'
import { randomUUID } from 'node:crypto'
import { HumanMessage, mapStoredMessageToChatMessage } from '@langchain/core/messages'
import { getApp } from '@/app/agent/chatbot'
import { createSession } from '@/app/database'

/**
 * ChatService
 * 负责处理聊天相关的业务逻辑
 */
export class ChatService {
  /**
   * 解析用户消息，转换为 LangChain 消息对象
   */
  parseUserMessage(message: string | any[] | Record<string, any>): HumanMessage {
    if (typeof message === 'string') {
      // 字符串格式：创建 HumanMessage
      return new HumanMessage(message)
    }

    if (Array.isArray(message)) {
      // 数组格式：多模态内容（文本 + 图片）
      return new HumanMessage({ content: message })
    }

    if (typeof message === 'object' && message !== null) {
      // 对象格式：尝试重建 LangChain 消息
      try {
        return mapStoredMessageToChatMessage(message as any) as HumanMessage
      }
      catch (error) {
        console.error('重建消息对象失败:', error)
        // 如果重建失败，尝试提取 content
        const content = message.content || message.kwargs?.content
        if (!content) {
          throw new Error('消息对象缺少 content 字段')
        }
        return new HumanMessage(content)
      }
    }

    throw new Error('无效的消息格式')
  }

  /**
   * 提取会话名称
   */
  extractSessionName(message: string | any[] | Record<string, any>): string {
    if (typeof message === 'string') {
      return message || '新会话'
    }

    if (Array.isArray(message)) {
      // 从多模态内容中提取文本
      const textContent = message.find(item => item.type === 'text')
      return textContent?.text || '新会话'
    }

    if (typeof message === 'object' && message !== null) {
      // 从消息对象中提取文本
      const content = message.content || message.kwargs?.content
      if (typeof content === 'string') {
        return content || '新会话'
      }
      if (Array.isArray(content)) {
        const textContent = content.find(item => item.type === 'text')
        return textContent?.text || '新会话'
      }
    }

    return '新会话'
  }

  /**
   * 获取或创建会话 ID
   */
  async getOrCreateThreadId(input: ChatMessageInput): Promise<{ threadId: string, isNewSession: boolean }> {
    const threadId
      = typeof input.thread_id === 'string' && input.thread_id
        ? input.thread_id
        : randomUUID()
    const isNewSession = !(typeof input.thread_id === 'string' && input.thread_id)

    // 如果是新会话，在数据库中创建会话记录
    if (isNewSession) {
      const sessionName = this.extractSessionName(input.message)

      if (!input.userId || !input.authenticatedClient) {
        throw new Error('创建会话时缺少 userId 或 authenticatedClient')
      }

      await createSession(threadId, sessionName, input.userId, input.authenticatedClient)
    }

    return { threadId, isNewSession }
  }

  /**
   * 创建流式聊天响应
   */
  async* streamChat(input: ChatMessageInput, threadId: string, isNewSession: boolean): AsyncGenerator<any, void, unknown> {
    // 解析用户消息
    const userMessage = this.parseUserMessage(input.message)

    // 配置线程
    const threadConfig = { configurable: { thread_id: threadId } }

    // 如果是新创建的会话，立即发送 sessionId
    if (isNewSession) {
      yield {
        type: 'session',
        thread_id: threadId,
      }
    }

    // 获取应用实例，传入模型和工具配置
    const app = await getApp(input.modelConfig, input.selectedTools, input.authenticatedClient, input.userId)

    let completeMessage = null

    // 使用 streamEvents 获取流式响应
    for await (const event of app.streamEvents(
      { messages: [userMessage] },
      { version: 'v2', ...threadConfig },
    )) {
      if (event.event === 'on_chat_model_stream') {
        const chunk = event.data?.chunk
        if (chunk?.content) {
          // 发送内容片段
          yield {
            type: 'chunk',
            content: chunk.content,
          }
        }
        // 保存完整的消息对象
        completeMessage = chunk
      }
      else if (event.event === 'on_chat_model_end') {
        const output = event.data?.output
        if (output?.tool_calls && output.tool_calls.length > 0) {
          yield {
            type: 'tool_calls',
            tool_calls: output.tool_calls.map((tc: any) => ({
              id: tc.id,
              name: tc.name,
              args: tc.args,
            })),
          }
        }
      }
      else if (event.event === 'on_tool_end') {
        const toolOutput = event.data?.output
        yield {
          type: 'tool_result',
          name: event.name,
          output: toolOutput,
        }
      }
      else if (event.event === 'on_tool_error') {
        const error = event.data?.error
        yield {
          type: 'tool_error',
          name: event.name,
          error: error?.message || String(error),
        }
      }
    }

    // 获取最终状态，包含完整的消息历史
    const finalState = await app.getState(threadConfig)
    const allMessages = finalState?.values?.messages || []

    // 序列化消息对象
    const serializedMessage = completeMessage
      ? JSON.parse(JSON.stringify(completeMessage))
      : null
    const serializedMessages = allMessages.map((msg: any) =>
      JSON.parse(JSON.stringify(msg)),
    )

    // 发送结束标记
    yield {
      type: 'end',
      status: 'success',
      thread_id: threadId,
      message: serializedMessage,
      messages: serializedMessages,
    }
  }

  /**
   * 获取聊天历史
   */
  async getChatHistory(query: ChatHistoryQuery): Promise<ChatHistoryResult> {
    const { thread_id, authenticatedClient, userId } = query

    // 获取应用实例
    const app = await getApp(undefined, undefined, authenticatedClient, userId)

    // 通过 graph.getState 获取历史
    const state = await app.getState({
      configurable: { thread_id },
    })

    // 序列化消息对象
    const messages = state?.values?.messages || []
    const serializedMessages = messages.map((msg: any) =>
      JSON.parse(JSON.stringify(msg)),
    )

    return {
      thread_id,
      history: serializedMessages,
    }
  }
}

// 导出单例实例
export const chatService = new ChatService()
