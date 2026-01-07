/**
 * Database 层统一导出
 *
 * 职责：数据访问层，负责所有数据库操作
 * - Supabase 客户端初始化
 * - Sessions 表 CRUD 操作
 * - Artifacts 表 CRUD 操作
 */

// 导出 Sessions 相关操作和类型
export {
  createSession,
  deleteSession,
  getAllSessions,
  initSessionTable,
  type SessionRow,
  updateSessionName,
} from './sessions'

// 导出 Supabase 客户端
export { supabase } from './supabase'
export { createBrowserClientInstance } from './supabase-client'
export { createSSRClient } from './supabase-server'
