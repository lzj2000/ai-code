import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { chatService } from '@/app/services'

import '../../utils/loadEnv'

export async function POST(request: NextRequest) {
  try {
    const { message, thread_id, modelConfig, selectedTools } = await request.json()

    if (!message) {
      return NextResponse.json({ error: '无效的消息格式' }, { status: 400 })
    }

    if (
      typeof message !== 'string'
      && !Array.isArray(message)
      && !(typeof message === 'object' && message !== null)
    ) {
      return NextResponse.json({ error: '无效的消息格式' }, { status: 400 })
    }
    if (thread_id && typeof thread_id !== 'string') {
      return NextResponse.json({ error: '无效的 thread_id' }, { status: 400 })
    }

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const payload of chatService.streamChat({
            message,
            thread_id,
            modelConfig,
            selectedTools,
          })) {
            const data = `${JSON.stringify(payload)}\n`
            controller.enqueue(new TextEncoder().encode(data))
          }
          controller.close()
        }
        catch (error) {
          const errorData
            = `${JSON.stringify({
              type: 'error',
              error: error || '服务器内部错误',
              message: '抱歉，处理你的请求时出现了问题。请稍后重试。',
            })}\n`
          controller.enqueue(new TextEncoder().encode(errorData))
          controller.close()
        }
      },
    })

    // 返回流式响应
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
    console.error('聊天 API 错误:', error)
    return NextResponse.json(
      {
        error: '服务器内部错误',
        response: '抱歉，处理你的请求时出现了问题。请稍后重试。',
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  // 判断是否为历史记录请求
  const { searchParams } = new URL(request.url)
  const thread_id = searchParams.get('thread_id')
  if (thread_id) {
    try {
      const result = await chatService.getChatHistory({ thread_id })
      return NextResponse.json(result)
    }
    catch (e) {
      return NextResponse.json(
        { error: '获取历史记录失败', detail: String(e) },
        { status: 500 },
      )
    }
  }
  // 默认返回API信息
  return NextResponse.json({
    message: 'LangGraph 聊天 API 正在运行',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /api/chat (流式响应)',
      history: 'GET /api/chat?thread_id=xxx (获取历史记录)',
    },
  })
}
