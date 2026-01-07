import { NextResponse } from 'next/server'
import { createSSRClient } from '@/app/database/supabase-server'
import {
  buildAuthResponse,
  buildErrorResponse,
  getSiteUrl,
} from '../_utils'

/**
 * 注册接口
 * POST /api/auth/register
 * body: { email: string, password: string, name: string, redirectTo?: string }
 */
export async function POST(request: Request) {
  try {
    const { email, password, name, redirectTo } = await request.json()

    if (
      typeof email !== 'string'
      || typeof password !== 'string'
      || typeof name !== 'string'
      || !email
      || !password
      || !name
    ) {
      return NextResponse.json(buildErrorResponse('缺少或无效的参数'), { status: 400 })
    }

    let redirectTarget = ''
    if (typeof redirectTo === 'string' && redirectTo) {
      redirectTarget = redirectTo
    }
    else {
      // 使用 URL 对象构建地址
      const siteUrl = getSiteUrl()
      // 指向服务端回调路由 /api/auth/callback
      redirectTarget = new URL('/api/auth/callback', siteUrl).toString()
    }

    const supabase = await createSSRClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTarget,
        data: {
          name,
        },
      },
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    // SSR Client 自动处理 Session Cookie（如果有 Session 返回）
    const result = {
      success: true,
      data: {
        user: data.user,
        session: data.session,
      },
    }

    return NextResponse.json(buildAuthResponse(result))
  }
  catch {
    return NextResponse.json(
      buildErrorResponse('注册失败'),
      { status: 500 },
    )
  }
}
