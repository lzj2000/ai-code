import { NextResponse } from 'next/server'
import { createSSRClient } from '@/app/database'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 如果有 next 参数，则跳转到指定页面，否则跳转到首页
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createSSRClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // 考虑反向代理情况
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        // 本地开发环境直接跳转
        return NextResponse.redirect(`${origin}${next}`)
      }
      else if (forwardedHost) {
        // 生产环境如果有代理，使用 forwarded host
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      }
      else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // 验证失败或无 code，跳转到错误页或登录页
  return NextResponse.redirect(`${origin}`)
}
