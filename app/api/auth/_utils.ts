import type { NextResponse } from 'next/server'

export const ACCESS_TOKEN_COOKIE = 'sb-access-token'
export const REFRESH_TOKEN_COOKIE = 'sb-refresh-token'

export const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
} as const

export function getBearerTokenFromHeader(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization)
    return null

  const trimmed = authorization.trim()
  const prefix = 'bearer '
  if (trimmed.length <= prefix.length)
    return null
  if (trimmed.slice(0, prefix.length).toLowerCase() !== prefix)
    return null

  const token = trimmed.slice(prefix.length).trim()
  return token || null
}

export function getCookieValueFromHeader(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader)
    return null

  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed)
      continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex <= 0)
      continue
    const key = trimmed.slice(0, eqIndex)
    if (key !== name)
      continue
    const value = trimmed.slice(eqIndex + 1)
    try {
      return decodeURIComponent(value)
    }
    catch {
      return value
    }
  }

  return null
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_TOKEN_COOKIE)
  response.cookies.delete(REFRESH_TOKEN_COOKIE)
}

export function setAuthCookiesFromSession(response: NextResponse, session: any) {
  if (!session?.access_token && !session?.refresh_token)
    return

  const maxAge = typeof session.expires_in === 'number' ? session.expires_in : 60 * 60 * 24 * 7

  if (session?.access_token) {
    response.cookies.set(ACCESS_TOKEN_COOKIE, session.access_token, {
      ...COOKIE_BASE_OPTIONS,
      maxAge,
    })
  }

  if (session?.refresh_token) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, session.refresh_token, {
      ...COOKIE_BASE_OPTIONS,
      maxAge,
    })
  }
}

export function buildAuthResponse(result: any) {
  const data = result?.data
  const session = data?.session
  const user = data?.user

  return {
    success: true,
    data: {
      user,
      session: session
        ? {
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            token_type: session.token_type,
          }
        : null,
    },
  }
}

export function buildErrorResponse(error: string) {
  return { success: false, error }
}
