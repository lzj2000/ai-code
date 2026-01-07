import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authService } from '@/app/services'
import { ACCESS_TOKEN_COOKIE, setAuthCookiesFromSession } from '../_utils'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  const result = await authService.getUserByToken(token)

  if (!result.success || !result.data?.user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  const user = result.data.user
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || '',
    },
  })
}

export async function POST(request: Request) {
  try {
    const { session } = await request.json()

    if (!session?.access_token) {
      return NextResponse.json({ success: false, error: '无效的会话数据' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })

    // 复用已有的 Cookie 设置逻辑，确保安全配置一致
    setAuthCookiesFromSession(response, session)

    return response
  }
  catch {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })
  }
}
