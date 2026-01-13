import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAuth } from '@/app/middleware/auth'
import { artifactService } from '@/app/services'

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    }

    const artifact = await artifactService.getById(id, auth.user!.id, auth.client)
    if (!artifact) {
      return NextResponse.json({ error: '未找到 artifact' }, { status: 404 })
    }

    return NextResponse.json({ artifact })
  }
  catch (e) {
    return NextResponse.json(
      { error: '获取 artifact 失败', detail: String(e) },
      { status: 500 },
    )
  }
})

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const result = await artifactService.create(body, auth.user!.id, auth.client)
    return NextResponse.json(result)
  }
  catch (e) {
    const message = String((e as any)?.message || e)
    if (message.includes('缺少') || message.includes('无效')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json(
      { error: '创建 artifact 失败', detail: String(e) },
      { status: 500 },
    )
  }
})
