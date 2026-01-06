import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreateSessionInput,
  CreateSessionResult,
  DeleteSessionInput,
  UpdateSessionInput,
} from './types'
import { randomUUID } from 'node:crypto'
import {
  createSession as dbCreateSession,
  deleteSession as dbDeleteSession,
  updateSessionName as dbUpdateSessionName,
  getAllSessions,
} from '@/app/database/sessions'

/**
 * SessionService
 * 负责处理会话管理相关的业务逻辑
 */
export class SessionService {
  /**
   * 获取所有会话列表
   * 注意：由于 RLS 策略，只会返回当前用户的会话
   * @param client Supabase 客户端（可选，用于 RLS 策略）
   */
  async getAllSessions(client?: SupabaseClient) {
    const sessions = await getAllSessions(client)
    // 转换数据库格式到应用格式
    return sessions.map(session => ({
      id: session.id,
      name: session.name,
      created_at: new Date(session.created_at).getTime(),
      updatedAt: new Date(session.created_at).getTime(),
    }))
  }

  /**
   * 创建新会话
   * @param input 创建会话的输入参数
   * @param userId 当前登录用户的ID
   * @param client Supabase 客户端（可选，用于 RLS 策略）
   */
  async createSession(
    input: CreateSessionInput,
    userId: string,
    client?: SupabaseClient,
  ): Promise<CreateSessionResult> {
    const id = randomUUID()
    const name = input.name || `新会话-${id.slice(0, 8)}`
    await dbCreateSession(id, name, userId, client)
    return { id }
  }

  /**
   * 删除会话
   * 注意：由于 RLS 策略，用户只能删除自己的会话
   */
  async deleteSession(input: DeleteSessionInput): Promise<void> {
    if (!input.id) {
      throw new Error('缺少 id')
    }
    await dbDeleteSession(input.id)
  }

  /**
   * 更新会话名称
   * 注意：由于 RLS 策略，用户只能更新自己的会话
   */
  async updateSessionName(input: UpdateSessionInput): Promise<void> {
    if (!input.id || !input.name) {
      throw new Error('缺少参数')
    }
    await dbUpdateSessionName(input.id, input.name)
  }
}

// 导出单例实例
export const sessionService = new SessionService()
