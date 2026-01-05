import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Session 数据类型
 */
export interface SessionRow {
  id: string
  name: string
  created_at: string
  user_id?: string // 用户ID
}

/**
 * 初始化 sessions 表
 * 注意：Supabase 中需要手动创建表，此函数仅用于文档说明
 *
 * SQL 创建语句：
 * CREATE TABLE sessions (
 *   id TEXT PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 */
export function initSessionTable() {
  // Supabase 不需要运行时初始化表，表应该在 Supabase 控制台中预先创建
}

/**
 * 创建新会话
 * @param id 会话ID
 * @param name 会话名称
 * @param userId 用户ID
 * @param client Supabase 客户端（可选，如果不提供则使用默认客户端）
 */
export async function createSession(
  id: string,
  name: string,
  userId: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = client || supabase
  const { error } = await db
    .from('sessions')
    .insert({
      id,
      name,
      user_id: userId,
    })

  if (error) {
    throw new Error(`创建会话失败: ${error.message}`)
  }
}

/**
 * 获取所有会话列表
 * @param client Supabase 客户端（可选，如果不提供则使用默认客户端）
 */
export async function getAllSessions(client?: SupabaseClient): Promise<SessionRow[]> {
  const db = client || supabase
  const { data, error } = await db
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`获取会话列表失败: ${error.message}`)
  }

  return data || []
}

/**
 * 更新会话名称
 */
export async function updateSessionName(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ name })
    .eq('id', id)

  if (error) {
    throw new Error(`更新会话名称失败: ${error.message}`)
  }
}

/**
 * 删除会话
 */
export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`删除会话失败: ${error.message}`)
  }
}
