import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createSSRClient } from '@/app/database/supabase-server'

/**
 * 认证用户信息接口
 */
export interface AuthUser {
  id: string
  email: string
  [key: string]: any
}

/**
 * 认证结果接口
 */
export interface AuthResult {
  user: AuthUser | null
  token: string | null
  client: any | null
  error?: string
}

/**
 * 从请求中提取和验证 token
 * 使用 SSR 客户端自动处理 Cookie
 *
 * @param request - Next.js 请求对象
 * @returns 认证结果
 */
export async function authenticateRequest(): Promise<AuthResult> {
  try {
    const supabase = await createSSRClient()

    // getUser 会自动从 Cookie 读取 token 并验证
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        user: null,
        token: null, // SSR 模式下不直接暴露 token
        client: null,
        error: 'Token 无效或已过期',
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email || '',
        ...user.user_metadata,
      },
      token: null, // 在 SSR 模式下，通常不需要手动处理 token
      client: supabase,
    }
  }
  catch (error) {
    console.error('认证过程出错:', error)
    return {
      user: null,
      token: null,
      client: null,
      error: '认证过程出错',
    }
  }
}

/**
 * 创建未授权响应
 */
export function unauthorizedResponse(message: string = '未授权') {
  return NextResponse.json(
    { error: message },
    { status: 401 },
  )
}

/**
 * Next.js 中间件 - 保护需要认证的路由
 */
export function createAuthMiddleware(handler: (request: NextRequest, auth: AuthResult) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    // 执行认证
    const auth = await authenticateRequest()

    // 如果认证失败,返回 401
    if (!auth.user) {
      return unauthorizedResponse(auth.error || '未授权')
    }

    // 认证成功,调用处理器
    return handler(request, auth)
  }
}

export type AuthedHandler = (request: NextRequest, auth: AuthResult) => Promise<Response>

/**
 * withAuth 是 createAuthMiddleware 的语义化包装
 * 用于路由层“包裹”业务逻辑，实现统一鉴权
 */
export function withAuth(handler: AuthedHandler) {
  return createAuthMiddleware(handler)
}
