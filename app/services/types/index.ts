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
}

export interface ChatHistoryQuery {
  thread_id: string
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
