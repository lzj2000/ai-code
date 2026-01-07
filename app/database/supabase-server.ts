import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 创建服务端 Supabase 客户端 (SSR)
 * 用于 Server Actions, Route Handlers, 和 Middleware
 * 自动处理 Cookie 读取和写入
 */
export async function createSSRClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
          catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}
