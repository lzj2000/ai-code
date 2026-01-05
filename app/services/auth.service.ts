import type {
  ExchangeCodeForSessionInput,
  LoginWithPasswordInput,
  LogoutWithTokenInput,
  ServiceResult,
  SignUpWithEmailInput,
} from './types'
import {
  exchangeCodeForSession,
  signInWithPassword,
  signOutWithToken,
  signUpWithEmail,
} from '@/app/database'

/**
 * AuthService
 * 负责处理登录/注册/登出/邮箱验证回调等认证相关业务逻辑
 */
export class AuthService {
  /**
   * 邮箱 + 密码登录
   */
  async loginWithPassword(input: LoginWithPasswordInput): Promise<ServiceResult> {
    const { email, password } = input
    const { data, error } = await signInWithPassword(email, password)
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  }

  /**
   * 邮箱注册（会发送验证邮件，session 可能为空，取决于 Supabase 配置）
   */
  async signUpWithEmail(input: SignUpWithEmailInput): Promise<ServiceResult> {
    const { email, password, name, redirectTo } = input
    const { data, error } = await signUpWithEmail(email, password, name, redirectTo)
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  }

  /**
   * 使用 access_token 登出
   * 说明：这里沿用 Database 层实现，通过 setSession 后再 signOut
   */
  async logoutWithToken(input: LogoutWithTokenInput): Promise<ServiceResult> {
    const { accessToken } = input
    const { error, data } = await signOutWithToken(accessToken) as any
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  }

  /**
   * 邮箱验证回调：使用 code 交换 session
   * 说明：Supabase 邮件验证回调通常会携带 code 参数
   */
  async exchangeCodeForSession(input: ExchangeCodeForSessionInput): Promise<ServiceResult> {
    const { code } = input
    const { data, error } = await exchangeCodeForSession(code)
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  }

  /**
   * 通过 token 获取用户信息
   */
  async getUserByToken(token: string): Promise<ServiceResult> {
    const { data, error } = await import('@/app/database').then(m => m.getUserByToken(token))
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  }
}

// 导出单例实例
export const authService = new AuthService()
