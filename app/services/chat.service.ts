import type { ChatHistoryQuery, ChatHistoryResult, ChatMessageInput } from './types'
import { randomUUID } from 'node:crypto'
import * as Sentry from '@sentry/nextjs'
import { HumanMessage, mapStoredMessageToChatMessage } from '@langchain/core/messages'
import { getApp } from '@/app/agent/chatbot'
import { createSession } from '@/app/database'
import { captureChatException, createChatObservationAttributes } from '@/app/utils/sentry'

export class ChatService {
  parseUserMessage(message: string | any[] | Record<string, any>): HumanMessage {
    if (typeof message === 'string') {
      return new HumanMessage(message)
    }

    if (Array.isArray(message)) {
      return new HumanMessage({ content: message })
    }

    if (typeof message === 'object' && message !== null) {
      try {
        return mapStoredMessageToChatMessage(message as any) as HumanMessage
      }
      catch (error) {
        console.error('Failed to rebuild LangChain message from stored payload:', error)
        const content = message.content || message.kwargs?.content
        if (!content) {
          throw new Error('Stored message payload is missing content.')
        }
        return new HumanMessage(content)
      }
    }

    throw new Error('Invalid message payload.')
  }

  extractSessionName(message: string | any[] | Record<string, any>): string {
    if (typeof message === 'string') {
      return message || 'New session'
    }

    if (Array.isArray(message)) {
      const textContent = message.find(item => item.type === 'text')
      return textContent?.text || 'New session'
    }

    if (typeof message === 'object' && message !== null) {
      const content = message.content || message.kwargs?.content
      if (typeof content === 'string') {
        return content || 'New session'
      }
      if (Array.isArray(content)) {
        const textContent = content.find(item => item.type === 'text')
        return textContent?.text || 'New session'
      }
    }

    return 'New session'
  }

  async getOrCreateThreadId(input: ChatMessageInput): Promise<{ threadId: string, isNewSession: boolean }> {
    return Sentry.startSpan({
      name: 'chat.thread.resolve',
      op: 'ai.thread.resolve',
      attributes: createChatObservationAttributes({
        stage: 'thread_resolve',
        threadId: typeof input.thread_id === 'string' ? input.thread_id : undefined,
        userId: input.userId,
        modelConfig: input.modelConfig,
        selectedTools: input.selectedTools,
      }),
    }, async () => {
      const threadId
        = typeof input.thread_id === 'string' && input.thread_id
          ? input.thread_id
          : randomUUID()
      const isNewSession = !(typeof input.thread_id === 'string' && input.thread_id)

      if (isNewSession) {
        const sessionName = this.extractSessionName(input.message)

        if (!input.userId || !input.authenticatedClient) {
          throw new Error('Missing userId or authenticatedClient while creating a session.')
        }

        await createSession(threadId, sessionName, input.userId, input.authenticatedClient)
      }

      return { threadId, isNewSession }
    })
  }

  async* streamChat(input: ChatMessageInput, threadId: string, isNewSession: boolean): AsyncGenerator<any, void, unknown> {
    const observation = createChatObservationAttributes({
      stage: 'stream_chat',
      threadId,
      userId: input.userId,
      modelConfig: input.modelConfig,
      selectedTools: input.selectedTools,
    })

    const streamSpan = Sentry.startInactiveSpan({
      name: 'chat.stream',
      op: 'ai.stream',
      attributes: observation,
    })

    try {
      const userMessage = this.parseUserMessage(input.message)
      const threadConfig = { configurable: { thread_id: threadId } }

      if (isNewSession) {
        yield {
          type: 'session',
          thread_id: threadId,
        }
      }

      const app = await Sentry.startSpan({
        name: 'chat.agent.bootstrap',
        op: 'ai.agent.bootstrap',
        attributes: observation,
      }, async () => {
        return getApp(input.modelConfig, input.selectedTools, input.authenticatedClient, input.userId)
      })

      let completeMessage: unknown = null

      for await (const event of app.streamEvents(
        { messages: [userMessage] },
        { version: 'v2', ...threadConfig },
      )) {
        if (event.event === 'on_chat_model_stream') {
          const chunk = event.data?.chunk
          if (chunk?.content) {
            yield {
              type: 'chunk',
              content: chunk.content,
            }
          }
          completeMessage = chunk
          continue
        }

        if (event.event === 'on_chat_model_end') {
          const output = event.data?.output
          const toolCalls = output?.tool_calls

          if (toolCalls && toolCalls.length > 0) {
            Sentry.addBreadcrumb({
              category: 'ai.tool_calls',
              message: 'Model returned tool calls.',
              level: 'info',
              data: {
                threadId,
                toolNames: toolCalls.map((toolCall: any) => toolCall.name),
              },
            })

            yield {
              type: 'tool_calls',
              tool_calls: toolCalls.map((toolCall: any) => ({
                id: toolCall.id,
                name: toolCall.name,
                args: toolCall.args,
              })),
            }
          }

          continue
        }

        if (event.event === 'on_tool_end') {
          const toolOutput = event.data?.output

          Sentry.addBreadcrumb({
            category: 'ai.tool',
            message: 'Tool execution completed.',
            level: 'info',
            data: {
              threadId,
              toolName: event.name,
            },
          })

          yield {
            type: 'tool_result',
            name: event.name,
            output: toolOutput,
          }

          continue
        }

        if (event.event === 'on_tool_error') {
          const toolError = event.data?.error

          captureChatException(toolError, {
            stage: 'tool_error',
            threadId,
            userId: input.userId,
            modelConfig: input.modelConfig,
            selectedTools: input.selectedTools,
            eventName: event.name,
          })

          yield {
            type: 'tool_error',
            name: event.name,
            error: toolError?.message || String(toolError),
          }
        }
      }

      const finalState = await Sentry.startSpan({
        name: 'chat.final_state',
        op: 'ai.final_state',
        attributes: observation,
      }, async () => {
        return app.getState(threadConfig)
      })

      const allMessages = finalState?.values?.messages || []
      const serializedMessage = completeMessage
        ? JSON.parse(JSON.stringify(completeMessage))
        : null
      const serializedMessages = allMessages.map((message: any) =>
        JSON.parse(JSON.stringify(message)),
      )

      yield {
        type: 'end',
        status: 'success',
        thread_id: threadId,
        message: serializedMessage,
        messages: serializedMessages,
      }
    }
    catch (error) {
      captureChatException(error, {
        stage: 'chat_service_stream',
        threadId,
        userId: input.userId,
        modelConfig: input.modelConfig,
        selectedTools: input.selectedTools,
      })
      throw error
    }
    finally {
      streamSpan?.end()
    }
  }

  async getChatHistory(query: ChatHistoryQuery): Promise<ChatHistoryResult> {
    return Sentry.startSpan({
      name: 'chat.history.get_state',
      op: 'ai.history.get_state',
      attributes: createChatObservationAttributes({
        stage: 'chat_history_state',
        threadId: query.thread_id,
        userId: query.userId,
      }),
    }, async () => {
      const app = await getApp(undefined, undefined, query.authenticatedClient, query.userId)
      const state = await app.getState({
        configurable: { thread_id: query.thread_id },
      })
      const messages = state?.values?.messages || []
      const serializedMessages = messages.map((message: any) =>
        JSON.parse(JSON.stringify(message)),
      )

      return {
        thread_id: query.thread_id,
        history: serializedMessages,
      }
    })
  }
}

export const chatService = new ChatService()
