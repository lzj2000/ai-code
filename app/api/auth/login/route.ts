import { NextResponse } from 'next/server'
import { authService } from '@/app/services'
import {
  buildAuthResponse,
  buildErrorResponse,
  setAuthCookiesFromSession,
} from '../_utils'

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

    const result = await authService.loginWithPassword({ email, password })
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    const response = NextResponse.json(buildAuthResponse(result))
    const session = (result as any)?.data?.session
    // 将 token 写入 HttpOnly Cookie，前端无需（也不应）自行保存敏感 token
    setAuthCookiesFromSession(response, session)

    return response
  }
  catch {
    return NextResponse.json(
      buildErrorResponse('登录失败'),
      { status: 500 },
    )
  }
}
