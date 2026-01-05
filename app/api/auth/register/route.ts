import { NextResponse } from 'next/server'
import { authService } from '@/app/services'
import {
  buildAuthResponse,
  buildErrorResponse,
  setAuthCookiesFromSession,
} from '../_utils'

/**
 * 注册接口
 * POST /api/auth/register
 * body: { email: string, password: string, name: string, redirectTo?: string }
 *
 * 说明：
 * - redirectTo 是 Supabase 邮件验证完成后回跳地址
 * - 默认使用当前域名下的 /api/auth/callback
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

    const redirectTarget
      = typeof redirectTo === 'string' && redirectTo
        ? redirectTo
        : `${location.origin}/api/auth/callback?`
    const result = await authService.signUpWithEmail({
      email,
      password,
      name,
      redirectTo: redirectTarget,
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    const response = NextResponse.json(buildAuthResponse(result))

    const session = (result as any)?.data?.session
    // 如果 Supabase 配置允许注册后直接返回 session，则顺便持久化 token
    setAuthCookiesFromSession(response, session)

    return response
  }
  catch {
    return NextResponse.json(
      buildErrorResponse('注册失败'),
      { status: 500 },
    )
  }
}
