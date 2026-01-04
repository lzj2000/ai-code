import { NextResponse } from 'next/server'
import { sessionService } from '@/app/services'

export async function GET() {
  try {
    const sessions = sessionService.getAllSessions()
    return NextResponse.json({ sessions })
  }
  catch (e) {
    return NextResponse.json(
      { error: '获取会话列表失败', detail: String(e) },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    const { id } = sessionService.createSession({ name })
    return NextResponse.json({ id })
  }
  catch (e) {
    return NextResponse.json(
      { error: '新建会话失败', detail: String(e) },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    if (!id)
      return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    sessionService.deleteSession({ id })
    return NextResponse.json({ success: true })
  }
  catch (e) {
    return NextResponse.json(
      { error: '删除会话失败', detail: String(e) },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, name } = await request.json()
    if (!id || !name)
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    sessionService.updateSessionName({ id, name })
    return NextResponse.json({ success: true })
  }
  catch (e) {
    return NextResponse.json(
      { error: '重命名会话失败', detail: String(e) },
      { status: 500 },
    )
  }
}
