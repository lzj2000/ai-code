import { NextResponse } from 'next/server'
import { authService } from '@/app/services'
import {
  ACCESS_TOKEN_COOKIE,
  buildErrorResponse,
  clearAuthCookies,
  getBearerTokenFromHeader,
  getCookieValueFromHeader,
} from '../_utils'

/**
 * 登出接口
 * POST /api/auth/logout
 *
 * 支持两种传参方式：
 * - Header: Authorization: Bearer <access_token>
 * - body: { access_token: string }
 */
export async function POST(request: Request) {
  try {
    const bearerToken = getBearerTokenFromHeader(request)
    let accessToken = bearerToken

    if (!accessToken) {
      const body = await request.json().catch(() => ({} as any))
      accessToken = typeof body?.access_token === 'string' ? body.access_token : null
    }

    if (!accessToken) {
      // 兼容：如果前端不主动传 token，则从 HttpOnly Cookie 读取
      accessToken = getCookieValueFromHeader(request, ACCESS_TOKEN_COOKIE)
    }

    // 无论服务端 signOut 是否成功，都应该清理本地持久化 token
    if (!accessToken) {
      const response = NextResponse.json({ success: true })
      clearAuthCookies(response)
      return response
    }

    const result = await authService.logoutWithToken({ accessToken })
    const response = NextResponse.json(result, { status: result.success ? 200 : 400 })
    clearAuthCookies(response)
    return response
  }
  catch {
    const response = NextResponse.json(
      buildErrorResponse('登出失败'),
      { status: 500 },
    )
    clearAuthCookies(response)
    return response
  }
}
