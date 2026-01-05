import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authService } from '@/app/services'
import { ACCESS_TOKEN_COOKIE } from '../_utils'

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
