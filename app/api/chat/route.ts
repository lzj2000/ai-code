import '../../utils/loadEnv';
import { NextRequest, NextResponse } from 'next/server';
import { HumanMessage } from '@langchain/core/messages';
import { getApp } from '@/app/agent/chatbot';

// 引入uuid生成器
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { message, thread_id, modelConfig } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: '无效的消息格式' }, { status: 400 });
    }

    // 创建消息对象
    const userMessage = new HumanMessage(message);
    // 优先使用前端传入的thread_id，否则自动生成
    const threadId =
      typeof thread_id === 'string' && thread_id ? thread_id : randomUUID();
    const threadConfig = {
      configurable: {
        thread_id: threadId,
        modelConfig
      }
    };

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 获取应用实例
          const app = await getApp();

          // 参考 demo，使用 streamEvents 获取流式响应
          for await (const event of app.streamEvents(
            { messages: [userMessage] },
            { version: 'v2', ...threadConfig }
          )) {
            if (event.event === 'on_chat_model_stream') {
              const chunk = event.data?.chunk;
              if (chunk?.content) {
                const data =
                  JSON.stringify({
                    type: 'chunk',
                    content: chunk.content,
                  }) + '\n';
                controller.enqueue(new TextEncoder().encode(data));
              }
            }
          }
          // 发送结束标记
          const endData =
            JSON.stringify({
              type: 'end',
              status: 'success',
              thread_id: threadId,
            }) + '\n';
          controller.enqueue(new TextEncoder().encode(endData));
          controller.close();
        } catch (error) {
          const errorData =
            JSON.stringify({
              type: 'error',
              error: error || '服务器内部错误',
              message: '抱歉，处理你的请求时出现了问题。请稍后重试。',
            }) + '\n';
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      },
    });

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('聊天 API 错误:', error);
    return NextResponse.json(
      {
        error: '服务器内部错误',
        response: '抱歉，处理你的请求时出现了问题。请稍后重试。',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // 判断是否为历史记录请求
  const { searchParams } = new URL(request.url);
  const thread_id = searchParams.get('thread_id');
  if (thread_id) {
    try {
      // 获取应用实例
      const app = await getApp();

      // 通过graph.getState获取历史
      const state = await app.getState({
        configurable: { thread_id },
      });
      return NextResponse.json({
        thread_id,
        history: state?.values?.messages || [],
      });
    } catch (e) {
      return NextResponse.json(
        { error: '获取历史记录失败', detail: String(e) },
        { status: 500 }
      );
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
  });
}
