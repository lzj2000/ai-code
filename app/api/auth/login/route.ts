import { NextResponse } from 'next/server'
import { createSSRClient } from '@/app/database/supabase-server'
import { buildAuthResponse, buildErrorResponse } from '../_utils'

/**
 * 登录接口
 * POST /api/auth/login
 * body: { email: string, password: string }
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json(buildErrorResponse('缺少或无效的参数'), { status: 400 })
    }

    const supabase = await createSSRClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    // 成功登录后，SSR client 会自动设置 Cookie，无需手动处理
    // 构造返回数据
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
      buildErrorResponse('登录失败'),
      { status: 500 },
    )
  }
}
