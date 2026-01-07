import { createBrowserClient } from '@supabase/ssr'

/**
 * 创建客户端 Supabase 客户端
 * 用于 React 组件和 Hooks
 */
export function createBrowserClientInstance() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}
