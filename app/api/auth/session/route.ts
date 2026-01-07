import { NextResponse } from 'next/server'
import { createSSRClient } from '@/app/database/supabase-server'

export async function GET() {
  try {
    const supabase = await createSSRClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // 返回前端需要的用户字段
    return NextResponse.json({
      user: {
        ...(user.user_metadata || {}),
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || '',
      },
    })
  }
  catch (error) {
    console.error('获取会话失败:', error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
