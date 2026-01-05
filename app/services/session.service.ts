import type {
  CreateSessionInput,
  CreateSessionResult,
  DeleteSessionInput,
  Session,
  UpdateSessionInput,
} from './types'
import { randomUUID } from 'node:crypto'
import {
  createSession as dbCreateSession,
  deleteSession as dbDeleteSession,
  updateSessionName as dbUpdateSessionName,
  getAllSessions,
} from '@/app/agent/db'

/**
 * SessionService
 * 负责处理会话管理相关的业务逻辑
 */
export class SessionService {
  /**
   * 获取所有会话列表
   */
  getAllSessions(): Session[] {
    return getAllSessions() as Session[]
  }

  /**
   * 创建新会话
   */
  createSession(input: CreateSessionInput): CreateSessionResult {
    const id = randomUUID()
    const name = input.name || `新会话-${id.slice(0, 8)}`
    dbCreateSession(id, name)
    return { id }
  }

  /**
   * 删除会话
   */
  deleteSession(input: DeleteSessionInput): void {
    if (!input.id) {
      throw new Error('缺少 id')
    }
    dbDeleteSession(input.id)
  }

  /**
   * 更新会话名称
   */
  updateSessionName(input: UpdateSessionInput): void {
    if (!input.id || !input.name) {
      throw new Error('缺少参数')
    }
    dbUpdateSessionName(input.id, input.name)
  }
}

// 导出单例实例
export const sessionService = new SessionService()
