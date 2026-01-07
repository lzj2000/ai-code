import { NextResponse } from 'next/server'
import { createSSRClient } from '@/app/database/supabase-server'
import { buildErrorResponse } from '../_utils'

/**
 * 登出接口
 * POST /api/auth/logout
 */
export async function POST() {
  try {
    const supabase = await createSSRClient()

    // signOut 会自动清理服务端的 Session 和 Cookie
    const { error } = await supabase.auth.signOut()

    if (error) {
      // 即使出错，也应该返回成功让前端继续处理（通常意味着 Token 已经无效）
      console.error('Supabase signOut error:', error)
    }

    // 返回成功响应
    return NextResponse.json({ success: true }, { status: 200 })
  }
  catch {
    return NextResponse.json(
      buildErrorResponse('登出失败'),
      { status: 500 },
    )
  }
}
