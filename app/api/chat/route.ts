import * as Sentry from '@sentry/nextjs'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { ModelConfig } from '@/app/agent/utils/modelFactory'
import { withAuth } from '@/app/middleware/auth'

import { chatService } from '@/app/services'
import { captureChatException, createChatObservationAttributes, toErrorMessage } from '@/app/utils/sentry'
import '../../utils/loadEnv'

interface ChatRoutePayload {
  message?: unknown
  thread_id?: string
  modelConfig?: ModelConfig
  selectedTools?: string[]
}

export const POST = withAuth(async (request: NextRequest, auth): Promise<Response> => {
  let requestPayload: ChatRoutePayload = {}

  try {
    requestPayload = await request.json() as ChatRoutePayload
    const { message, thread_id, modelConfig, selectedTools } = requestPayload

    if (!message) {
      return NextResponse.json({ error: 'Invalid message payload.' }, { status: 400 })
    }

    const { threadId, isNewSession } = await chatService.getOrCreateThreadId({
      message,
      thread_id,
      modelConfig,
      selectedTools,
      userId: auth.user!.id,
      authenticatedClient: auth.client,
    })

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const payload of chatService.streamChat({
            message,
            thread_id,
            modelConfig,
            selectedTools,
            userId: auth.user!.id,
            authenticatedClient: auth.client,
          }, threadId, isNewSession)) {
            controller.enqueue(new TextEncoder().encode(`${JSON.stringify(payload)}\n`))
          }

          controller.close()
        }
        catch (error) {
          captureChatException(error, {
            stage: 'chat_stream',
            threadId,
            userId: auth.user!.id,
            modelConfig,
            selectedTools,
          })

          controller.enqueue(new TextEncoder().encode(`${JSON.stringify({
            type: 'error',
            error: toErrorMessage(error),
            message: 'An internal error interrupted the chat stream.',
          })}\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }
  catch (error) {
    captureChatException(error, {
      stage: 'chat_request',
      threadId: requestPayload?.thread_id,
      userId: auth.user!.id,
      modelConfig: requestPayload?.modelConfig,
      selectedTools: requestPayload?.selectedTools,
    })

    return NextResponse.json(
      {
        error: 'Internal server error.',
        response: 'An internal error occurred while processing the chat request.',
      },
      { status: 500 },
    )
  }
})

export const GET = withAuth(async (request: NextRequest, auth) => {
  const { searchParams } = new URL(request.url)
  const thread_id = searchParams.get('thread_id')

  if (thread_id) {
    try {
      const result = await Sentry.startSpan({
        name: 'chat.history.fetch',
        op: 'ai.history.fetch',
        attributes: createChatObservationAttributes({
          stage: 'chat_history',
          threadId: thread_id,
          userId: auth.user!.id,
        }),
      }, async () => {
        return chatService.getChatHistory({
          thread_id,
          userId: auth.user!.id,
          authenticatedClient: auth.client,
        })
      })

      return NextResponse.json(result)
    }
    catch (error) {
      captureChatException(error, {
        stage: 'chat_history',
        threadId: thread_id,
        userId: auth.user!.id,
      })

      return NextResponse.json(
        { error: 'Failed to load chat history.', detail: toErrorMessage(error) },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({
    message: 'LangGraph chat API is running.',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /api/chat (streaming response)',
      history: 'GET /api/chat?thread_id=xxx (chat history)',
    },
  })
})
