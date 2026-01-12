import type { CanvasArtifact } from '../canvas/canvas-types'
import type { Message } from '../page'
import { AIMessage, HumanMessage, mapStoredMessagesToChatMessages } from '@langchain/core/messages'
import { useCallback, useEffect } from 'react'
import { getCanvasParser } from '../canvas/CanvasArtifactParser'

/**
 * 聊天历史加载 Hook
 *
 * 功能:
 * - 自动加载指定会话的历史消息
 * - 当会话 ID 变化时自动重新加载
 * - 直接使用 LangChain 原始消息格式，无需转换
 * - 判断会话是否包含用户消息
 *
 * 使用场景:
 * - 切换到历史会话时加载之前的对话
 * - 刷新页面后恢复当前会话
 *
 * @param sessionId - 当前会话 ID
 * @param onLoadMessages - 加载完成后的回调,接收消息数组
 * @param onHasUserMessage - 设置是否有用户消息的回调
 */
export function useChatHistory(
  sessionId: string,
  onLoadMessages: (messages: Message[]) => void,
  onHasUserMessage: (hasUser: boolean) => void,
) {
  /**
   * 加载历史消息
   *
   * 流程:
   * 1. 从 API 获取会话历史
   * 2. 直接使用 LangChain 消息对象（无需格式转换）
   * 3. 更新消息列表和用户消息标记
   *
   * @param threadId - 要加载的会话 ID
   */
  const loadHistory = useCallback(async (threadId: string) => {
    try {
      // 先清空消息列表
      onLoadMessages([])
      // 1. 请求历史记录
      const res = await fetch(`/api/chat?thread_id=${threadId}`)
      const data = await res.json()

      if (Array.isArray(data.history) && data.history.length > 0) {
        let historyMsgs: Message[] = []

        try {
          // 2. 使用 LangChain 的反序列化方法重建消息对象
          // 首先确保数据是纯 JSON 对象
          const serializedData = JSON.parse(JSON.stringify(data.history))

          historyMsgs = mapStoredMessagesToChatMessages(serializedData) as Message[]
        }
        catch {
          // 手动重建消息对象作为备选方案
          historyMsgs = data.history.map((msg: any, idx: number) => {
            // 多种方式提取消息类型
            let msgType = null

            // 优先从 id 数组中提取（LangChain 序列化格式）
            if (msg.id && Array.isArray(msg.id)) {
              // LangChain 消息的 id 格式: ["langchain_core", "messages", "HumanMessage"]
              const idArray = msg.id
              for (const part of idArray) {
                if (part === 'HumanMessage' || part === 'human') {
                  msgType = 'human'
                  break
                }
                else if (part === 'AIMessage' || part === 'ai') {
                  msgType = 'ai'
                  break
                }
              }
            }

            // 如果没找到，检查 type 字段（但排除 "constructor"）
            if (!msgType && msg.type && msg.type !== 'constructor') {
              msgType = msg.type
            }

            // 如果还是没有，从 kwargs 或 data 中提取
            if (!msgType) {
              const msgData = msg.data || msg.kwargs
              if (msgData) {
                msgType = msgData.type
              }
            }

            // 如果依然无法判断，根据消息顺序推测（偶数=用户，奇数=AI）
            if (!msgType) {
              msgType = idx % 2 === 0 ? 'human' : 'ai'
            }

            const msgData = msg.data || msg.kwargs || msg
            const content = msgData.content || msg.content || ''
            const messageId = msgData.id || msg.id

            if (msgType === 'human' || msgType === 'HumanMessage') {
              return new HumanMessage({
                content,
                id: messageId,
              }) as Message
            }
            else {
              return new AIMessage({
                content,
                id: messageId,
              }) as Message
            }
          })
        }

        const parser = getCanvasParser()
        const enriched = historyMsgs.map((msg) => {
          const msgType = msg.getType?.() || (msg as any)._getType?.()
          if (msgType !== 'ai')
            return msg

          if (typeof msg.content !== 'string')
            return msg

          const contentLower = msg.content.toLowerCase()
          if (!contentLower.includes('<canvasartifact'))
            return msg

          const rawId = (msg as any).id
          const messageId = typeof rawId === 'string'
            ? rawId
            : Array.isArray(rawId)
              ? rawId.map(String).join(':')
              : String(rawId ?? '')

          if (!messageId)
            return msg

          const artifactsById = new Map<string, CanvasArtifact>()
          const now = new Date()

          parser.resetState(messageId)
          parser.setCallbacks({
            onArtifactStart: (metadata) => {
              const existing = artifactsById.get(metadata.id)
              const base: CanvasArtifact = existing || {
                id: metadata.id,
                type: metadata.type,
                title: metadata.title,
                code: { language: 'jsx', content: '' },
                status: 'creating',
                isStreaming: true,
                messageId,
                sessionId: threadId,
                currentVersion: 1,
                createdAt: now,
                updatedAt: now,
              }
              artifactsById.set(metadata.id, {
                ...base,
                type: metadata.type,
                title: metadata.title,
                updatedAt: now,
              })
            },
            onCodeUpdate: (data) => {
              const existing = artifactsById.get(data.artifactId)
              if (!existing)
                return
              artifactsById.set(data.artifactId, {
                ...existing,
                code: { language: data.language, content: data.content },
                status: 'streaming',
                isStreaming: true,
                updatedAt: now,
              })
            },
            onArtifactComplete: (artifact) => {
              const existing = artifactsById.get(artifact.id)
              const base: CanvasArtifact = existing || {
                id: artifact.id,
                type: artifact.type,
                title: artifact.title,
                code: artifact.code,
                config: artifact.config,
                status: 'creating',
                isStreaming: true,
                messageId,
                sessionId: threadId,
                currentVersion: 1,
                createdAt: now,
                updatedAt: now,
              }
              artifactsById.set(artifact.id, {
                ...base,
                type: artifact.type,
                title: artifact.title,
                code: artifact.code,
                config: artifact.config,
                status: 'ready',
                isStreaming: false,
                currentVersion: base.currentVersion + 1,
                updatedAt: now,
              })
            },
          })
          parser.parse(messageId, msg.content)
          parser.resetState(messageId)

          const artifacts = Array.from(artifactsById.values())
          if (artifacts.length === 0) {
            return msg
          }

          (msg as Message).artifacts = artifacts
          return msg
        })

        // 3. 更新消息列表
        onLoadMessages(enriched)

        // 4. 检查是否有用户消息(用于判断是否需要更新会话名)
        const hasUserMsg = historyMsgs.some((msg) => {
          const msgType = msg.getType?.() || (msg as any)._getType?.()
          return msgType === 'human'
        })
        onHasUserMessage(hasUserMsg)
      }
      else {
        // 没有历史记录,重置为初始状态
        onLoadMessages([])
        onHasUserMessage(false)
      }
    }
    catch (error) {
      // 静默失败,不影响用户体验
      console.error('加载历史记录失败:', error)
      onLoadMessages([])
      onHasUserMessage(false)
    }
  }, [onLoadMessages, onHasUserMessage])

  // 当 sessionId 变化时自动加载历史记录
  useEffect(() => {
    loadHistory(sessionId)
  }, [sessionId, loadHistory])

  return { loadHistory }
}
