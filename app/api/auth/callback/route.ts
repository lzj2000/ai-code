import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { authService } from '@/app/services'
import { setAuthCookiesFromSession } from '../_utils'

/**
 * 邮箱验证回调 API
 *
 * GET /api/auth/callback?code=...
 * - Supabase 邮件确认 / Magic Link / OAuth(带 PKCE) 等会回调并携带 code
 * - 本接口用 code 换取 session，并写入 HttpOnly Cookie
 */

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription
    = requestUrl.searchParams.get('error_description')
      || requestUrl.searchParams.get('message')

  // 1) Supabase 直接回传错误（例如 redirect 不合法、链接过期等）
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/?authError=${encodeURIComponent(errorDescription || error)}`,
        request.url,
      ),
    )
  }

  // 2) 没有 code：常见于错误被放在 hash(#) 里，或者用户手动访问
  if (!code) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    // 3) 交换 session
    const result = await authService.exchangeCodeForSession({ code })

    if (!result?.success) {
      const msg = result?.error || '验证失败，请重试'
      return NextResponse.redirect(
        new URL(`/?authError=${encodeURIComponent(msg)}`, request.url),
      )
    }

    const session = (result as any)?.data?.session
    const response = NextResponse.redirect(new URL('/', request.url))

    // 4) 写 cookie（优先使用统一的工具函数，保持行为一致）
    setAuthCookiesFromSession(response, session)

    return response
  }
  catch {
    return NextResponse.redirect(
      new URL(
        `/?authError=${encodeURIComponent('验证过程中发生错误')}`,
        request.url,
      ),
    )
  }
}
