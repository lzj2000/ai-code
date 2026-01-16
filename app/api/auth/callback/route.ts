import { NextResponse } from 'next/server'
import { createSSRClient } from '@/app/database/supabase-server'

function sanitizeNextPath(nextParam: string | null): string {
  if (!nextParam)
    return '/'

  if (!nextParam.startsWith('/'))
    return '/'

  if (nextParam.startsWith('//'))
    return '/'

  return nextParam
}

function buildRedirectResponse(request: Request, next: string) {
  const { origin } = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))

  const errorDescription = searchParams.get('error_description')
  const errorCode = searchParams.get('error_code')
  if (errorDescription || errorCode) {
    const message = errorDescription || errorCode || '认证失败'
    return NextResponse.redirect(`${origin}?auth_error=${encodeURIComponent(message)}`)
  }

  const supabase = await createSSRClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error)
      return buildRedirectResponse(request, next)
  }
  else {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const allowedTypes = new Set(['signup', 'magiclink', 'recovery', 'email_change', 'invite'])

    if (tokenHash && type && allowedTypes.has(type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
      if (!error)
        return buildRedirectResponse(request, next)
    }
  }

  return NextResponse.redirect(`${origin}`)
}
