import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAuth } from '@/app/middleware/auth'
import { sessionService } from '@/app/services'

/**
 * GET /api/chat/sessions
 * 获取当前用户的所有会话列表
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    // 使用认证客户端获取会话列表
    const sessions = await sessionService.getAllSessions(auth.client)
    return NextResponse.json({ sessions })
  }
  catch (e) {
    return NextResponse.json(
      { error: '获取会话列表失败', detail: String(e) },
      { status: 500 },
    )
  }
})

/**
 * POST /api/chat/sessions
 * 创建新会话
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const { name } = await request.json()
    const result = await sessionService.createSession(
      { name },
      auth.user!.id,
      auth.client,
    )
    return NextResponse.json(result)
  }
  catch (e) {
    return NextResponse.json(
      { error: '新建会话失败', detail: String(e) },
      { status: 500 },
    )
  }
})

/**
 * DELETE /api/chat/sessions
 * 删除会话
 */
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    }
    await sessionService.deleteSession({ id })
    return NextResponse.json({ success: true })
  }
  catch (e) {
    return NextResponse.json(
      { error: '删除会话失败', detail: String(e) },
      { status: 500 },
    )
  }
})

/**
 * PATCH /api/chat/sessions
 * 重命名会话
 */
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const { id, name } = await request.json()
    if (!id || !name) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }
    await sessionService.updateSessionName({ id, name })
    return NextResponse.json({ success: true })
  }
  catch (e) {
    return NextResponse.json(
      { error: '重命名会话失败', detail: String(e) },
      { status: 500 },
    )
  }
})
