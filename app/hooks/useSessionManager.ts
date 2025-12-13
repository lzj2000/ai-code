import { useState, useRef, useCallback } from 'react'
import { getOrCreateThreadId, setThreadId } from '../utils/threadId'

/**
 * 会话管理 Hook
 *
 * 负责管理聊天会话的所有状态和操作:
 * - 当前会话 ID 管理
 * - 创建和切换会话
 * - 更新会话名称
 * - 侧边栏同步
 *
 * 会话生命周期:
 * 1. 页面加载时自动获取或创建会话 ID
 * 2. 用户发送第一条消息时,使用消息内容更新会话名称
 * 3. 用户可以切换到历史会话或创建新会话
 */
export function useSessionManager() {
  // 当前会话 ID,初始化时自动获取或创建
  const [sessionId, setSessionId] = useState<string>(() => getOrCreateThreadId())

  // 标记当前会话是否已有用户消息(用于判断是否需要更新会话名)
  const [hasUserMessage, setHasUserMessage] = useState(false)

  // 侧边栏组件引用,用于触发侧边栏刷新
  const sidebarRef = useRef<{ fetchSessions: () => void }>(null)

  /**
   * 创建新会话
   * 1. 设置新的会话 ID
   * 2. 重置用户消息标记
   * 3. 刷新侧边栏会话列表
   *
   * @param id - 新会话的 ID
   */
  const createNewSession = useCallback((id: string) => {
    setThreadId(id)            // 更新本地存储
    setSessionId(id)           // 更新状态
    setHasUserMessage(false)   // 重置用户消息标记
    sidebarRef.current?.fetchSessions?.()  // 刷新侧边栏
  }, [])

  /**
   * 选择(切换)会话
   * 用户从侧边栏点击历史会话时调用
   *
   * @param id - 要切换到的会话 ID
   */
  const selectSession = useCallback((id: string) => {
    setSessionId(id)
    setThreadId(id)
  }, [])

  /**
   * 更新会话名称
   * 在用户发送第一条消息时自动调用
   * 使用消息内容的前 20 个字符作为会话名称
   *
   * 注意: 每个会话只会更新一次名称(hasUserMessage 标记)
   *
   * @param name - 新的会话名称(通常是用户的第一条消息)
   */
  const updateSessionName = useCallback(async (name: string) => {
    // 如果已经有用户消息,则不再更新会话名
    if (hasUserMessage) return

    try {
      await fetch('/api/chat/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          name: name.slice(0, 20)  // 截取前 20 个字符
        })
      })
      sidebarRef.current?.fetchSessions?.()  // 刷新侧边栏显示新名称
      setHasUserMessage(true)                 // 标记已更新
    } catch (error) {
      console.error('更新会话名称失败:', error)
    }
  }, [sessionId, hasUserMessage])

  return {
    sessionId,
    hasUserMessage,
    setHasUserMessage,
    sidebarRef,
    createNewSession,
    selectSession,
    updateSessionName
  }
}
