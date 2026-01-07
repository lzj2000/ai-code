import { createClient } from '@supabase/supabase-js'

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '缺少 Supabase 环境变量，请在 .env 中设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY。',
  )
}

// 创建默认 Supabase 客户端实例 (Anon Key)
// 主要用于无需高权限的简单查询或作为默认回退
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
