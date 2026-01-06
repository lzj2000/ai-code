/**
 * Services 层类型定义
 */

import type { ModelConfig } from '@/app/agent/utils/modelFactory'

// 聊天相关类型
export interface ChatMessageInput {
  message: string | any[] | Record<string, any>
  thread_id?: string
  selectedTools?: string[]
  modelConfig?: ModelConfig
  userId?: string // 用户 ID,用于创建会话
  authenticatedClient?: any // 带认证的 Supabase 客户端
}

export interface ChatHistoryQuery {
  thread_id: string
  userId?: string
  authenticatedClient?: any
}

export interface ChatHistoryResult {
  thread_id: string
  history: any[]
}

// 会话管理相关类型
export interface Session {
  id: string
  name: string
  created_at: string
}

export interface CreateSessionInput {
  name?: string
}

export interface CreateSessionResult {
  id: string
}

export interface DeleteSessionInput {
  id: string
}

export interface UpdateSessionInput {
  id: string
  name: string
}

export interface ServiceResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Auth 相关类型
export interface LoginWithPasswordInput {
  email: string
  password: string
}

export interface SignUpWithEmailInput {
  email: string
  password: string
  name: string
  redirectTo: string
}

export interface LogoutWithTokenInput {
  accessToken: string
}

export interface ExchangeCodeForSessionInput {
  code: string
}
