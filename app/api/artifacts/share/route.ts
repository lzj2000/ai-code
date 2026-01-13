import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAuth } from '@/app/middleware/auth'
import { artifactService } from '@/app/services'

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const result = await artifactService.createShare(body, auth.user!.id, auth.client)
    return NextResponse.json(result)
  }
  catch (e) {
    const message = String((e as any)?.message || e)
    if (message.includes('缺少') || message.includes('无效')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json(
      { error: '创建分享失败', detail: String(e) },
      { status: 500 },
    )
  }
})
