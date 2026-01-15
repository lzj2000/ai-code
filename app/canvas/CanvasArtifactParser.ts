/**
 * Canvas Artifact XML 流式解析器
 *
 * 负责实时解析 AI 输出的文本流，提取 <canvasArtifact> 标签
 *
 * 核心策略：
 * 1. 保留原始标签，不进行替换
 * 2. 通过回调函数触发状态更新
 * 3. 支持流式处理，标签可能跨多个 chunk 被分割
 */

import type { CanvasLanguage, CanvasType, ParserCallbacks, ParserState } from './canvas-types'
import {
  ARTIFACT_TAG_CLOSE,
  ARTIFACT_TAG_OPEN,
  CONFIG_TAG_CLOSE,
  CONFIG_TAG_OPEN,
  FILE_TAG_CLOSE,
  FILE_TAG_OPEN,
  FILES_TAG_CLOSE,
  FILES_TAG_OPEN,
  parseAttributes,
  unescapeXML,
} from './canvas-parser-constants'

/**
 * Canvas Artifact 解析器类
 */
export class CanvasArtifactParser {
  private state: Map<string, ParserState>
  private callbacks: ParserCallbacks

  constructor() {
    this.state = new Map()
    this.callbacks = {}
  }

  /**
   * 设置解析器回调
   */
  public setCallbacks(callbacks: ParserCallbacks): void {
    this.callbacks = callbacks
  }

  /**
   * 获取或初始化消息的解析状态
   */
  private getState(messageId: string): ParserState {
    if (!this.state.has(messageId)) {
      this.state.set(messageId, {
        position: 0,
        insideArtifact: false,
        insideFiles: false,
        insideFile: false,
        insideConfig: false,
        currentArtifact: null,
        currentFiles: null,
        currentFile: null,
        currentConfig: null,
        fullContent: '',
        messageId,
      })
    }
    return this.state.get(messageId)!
  }

  /**
   * 重置消息的解析状态
   */
  public resetState(messageId: string): void {
    this.state.delete(messageId)
  }

  /**
   * 查找标签结束位置
   */
  private findTagEnd(content: string, startPos: number): number {
    for (let i = startPos; i < content.length; i++) {
      if (content[i] === '>') {
        return i
      }
    }
    return -1
  }

  /**
   * 查找标签起始位置（不区分大小写）
   */
  private findTagIndex(content: string, startPos: number, tag: string): number {
    const safeStartPos = Math.max(0, startPos)
    // tag 作为正则字面量使用时需要转义，避免像 < 或 / 被当成特殊字符
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escapedTag, 'i')
    const match = regex.exec(content.slice(safeStartPos))
    return match ? safeStartPos + match.index : -1
  }

  /**
   * 查找可能的部分标签起点（处理跨 chunk 的标签）
   */
  private getPartialTagStart(content: string, startPos: number, tag: string): number {
    const safeStartPos = Math.max(0, startPos)
    const lowerContent = content.toLowerCase()
    const lowerTag = tag.toLowerCase()
    const maxLen = Math.min(lowerTag.length - 1, lowerContent.length - safeStartPos)

    for (let len = maxLen; len > 0; len--) {
      // 从结尾尝试匹配 “tag 的前缀”，用于处理诸如 "</canvasArti" + "fact>" 的分片情况
      const start = lowerContent.length - len
      if (start < safeStartPos)
        continue
      if (lowerContent.slice(start) === lowerTag.slice(0, len)) {
        return start
      }
    }

    return -1
  }

  /**
   * 解析 canvasArtifact 开始标签
   */
  private parseArtifactStart(
    content: string,
    startPos: number,
  ): {
    success: boolean
    endPos: number
    attributes?: Record<string, string>
    tagStart?: number
    incomplete?: boolean
  } {
    const tagStart = this.findTagIndex(content, startPos, ARTIFACT_TAG_OPEN)
    if (tagStart === -1) {
      return { success: false, endPos: startPos }
    }

    const tagEnd = this.findTagEnd(content, tagStart + ARTIFACT_TAG_OPEN.length)
    if (tagEnd === -1) {
      // 标签不完整，等待更多数据
      return { success: false, endPos: tagStart, tagStart, incomplete: true }
    }

    // 提取属性部分
    const attrString = content.slice(tagStart + ARTIFACT_TAG_OPEN.length, tagEnd)
    const attributes = parseAttributes(attrString)

    // 验证必需属性
    if (!attributes.id || !attributes.type || !attributes.title) {
      this.callbacks.onError?.({
        message: 'Missing required attributes (id, type, or title)',
        position: tagStart,
        context: content.slice(tagStart, tagEnd + 1),
      })
      return { success: false, endPos: tagEnd + 1 }
    }

    // 验证 type 必须是 "react" 或 "component"
    if (attributes.type !== 'react' && attributes.type !== 'component') {
      this.callbacks.onError?.({
        message: `Invalid type: "${attributes.type}". Only "react" and "component" are supported.`,
        position: tagStart,
        context: content.slice(tagStart, tagEnd + 1),
      })
      return { success: false, endPos: tagEnd + 1 }
    }

    return { success: true, endPos: tagEnd + 1, attributes }
  }

  /**
   * 解析 canvasFiles 开始标签
   */
  private parseFilesStart(
    content: string,
    startPos: number,
  ): {
    success: boolean
    endPos: number
    tagStart?: number
    incomplete?: boolean
    entryPath?: string
  } {
    const tagStart = this.findTagIndex(content, startPos, FILES_TAG_OPEN)
    if (tagStart === -1) {
      return { success: false, endPos: startPos }
    }

    const tagEnd = this.findTagEnd(content, tagStart + FILES_TAG_OPEN.length)
    if (tagEnd === -1) {
      return { success: false, endPos: tagStart, tagStart, incomplete: true }
    }

    const attrString = content.slice(tagStart + FILES_TAG_OPEN.length, tagEnd)
    const attributes = parseAttributes(attrString)
    const entryPath = typeof attributes.entry === 'string' ? attributes.entry : ''
    return { success: true, endPos: tagEnd + 1, entryPath }
  }

  /**
   * 解析 canvasFile 开始标签
   */
  private parseFileStart(
    content: string,
    startPos: number,
  ): {
    success: boolean
    endPos: number
    path: string
    language: CanvasLanguage
    tagStart?: number
    incomplete?: boolean
  } {
    const tagStart = this.findTagIndex(content, startPos, FILE_TAG_OPEN)
    if (tagStart === -1) {
      return { success: false, endPos: startPos, path: '', language: 'jsx' }
    }

    const tagEnd = this.findTagEnd(content, tagStart + FILE_TAG_OPEN.length)
    if (tagEnd === -1) {
      return { success: false, endPos: tagStart, path: '', language: 'jsx', tagStart, incomplete: true }
    }

    const attrString = content.slice(tagStart + FILE_TAG_OPEN.length, tagEnd)
    const attributes = parseAttributes(attrString)
    const path = typeof attributes.path === 'string' ? attributes.path : ''
    const language = (typeof attributes.language === 'string' ? attributes.language : 'jsx') as CanvasLanguage

    if (!path) {
      return { success: false, endPos: tagEnd + 1, path: '', language }
    }

    return { success: true, endPos: tagEnd + 1, path, language }
  }

  /**
   * 主解析方法
   *
   * @param messageId - 消息 ID
   * @param newContent - 新增的文本内容
   * @returns 原始文本（保留标签，不替换）
   */
  public parse(messageId: string, newContent: string): string {
    const state = this.getState(messageId)
    // fullContent 用于处理跨 chunk 的标签拆分：解析永远基于“累计内容”推进 position 游标
    state.fullContent += newContent

    const content = state.fullContent
    let pos = state.position

    while (pos < content.length) {
      // 状态 1: 不在 artifact 内，查找开始标签
      if (!state.insideArtifact) {
        const result = this.parseArtifactStart(content, pos)
        if (!result.success) {
          if (result.incomplete) {
            pos = result.tagStart ?? pos
            break
          }

          if (result.endPos > pos) {
            pos = result.endPos
            continue
          }

          const partialStart = this.getPartialTagStart(content, 0, ARTIFACT_TAG_OPEN)
          pos = partialStart !== -1 ? partialStart : content.length
          break
        }

        // 找到完整的开始标签
        const { id, type, title } = result.attributes!
        state.currentArtifact = { id, type: type as CanvasType, title }
        state.insideArtifact = true
        pos = result.endPos

        this.callbacks.onArtifactStart?.({
          id,
          type: type as CanvasType,
          title,
          messageId,
        })
        continue
      }

      // 状态 2: 在 artifact 内，查找 files 或 config 标签
      if (state.insideArtifact && !state.insideFiles && !state.insideConfig) {
        const filesResult = this.parseFilesStart(content, pos)
        if (filesResult.incomplete) {
          pos = filesResult.tagStart ?? pos
          break
        }
        if (filesResult.success) {
          state.currentFiles = {
            entryPath: filesResult.entryPath || '',
            files: [],
          }
          state.insideFiles = true
          pos = filesResult.endPos
          continue
        }

        // 检查 canvasConfig（可选）
        const configStart = this.findTagIndex(content, pos, CONFIG_TAG_OPEN)
        if (configStart !== -1 && configStart < this.findTagIndex(content, pos, ARTIFACT_TAG_CLOSE)) {
          state.currentConfig = { content: '' }
          state.insideConfig = true
          pos = configStart + CONFIG_TAG_OPEN.length
          continue
        }

        // 检查 artifact 结束标签
        const artifactEnd = this.findTagIndex(content, pos, ARTIFACT_TAG_CLOSE)
        if (artifactEnd !== -1) {
          // Artifact 结束，但没有 code
          this.completeArtifact(messageId, state)
          pos = artifactEnd + ARTIFACT_TAG_CLOSE.length
          continue
        }

        // 没有找到任何预期的标签，检查是否有部分标签
        const partialStarts = [
          this.getPartialTagStart(content, 0, FILES_TAG_OPEN),
          this.getPartialTagStart(content, 0, CONFIG_TAG_OPEN),
          this.getPartialTagStart(content, 0, ARTIFACT_TAG_CLOSE),
        ].filter(value => value !== -1) as number[]

        if (partialStarts.length > 0) {
          pos = Math.min(...partialStarts)
        }
        else {
          pos = content.length
        }
        break
      }

      // 状态 3: 在 files 内，查找 file 或 files 结束标签
      if (state.insideFiles && !state.insideFile) {
        const fileResult = this.parseFileStart(content, pos)
        if (fileResult.incomplete) {
          pos = fileResult.tagStart ?? pos
          break
        }
        if (fileResult.success) {
          state.currentFile = {
            path: fileResult.path,
            language: fileResult.language,
            content: '',
            startPosition: fileResult.endPos,
          }
          state.insideFile = true
          pos = fileResult.endPos
          continue
        }

        const filesEnd = this.findTagIndex(content, pos, FILES_TAG_CLOSE)
        if (filesEnd !== -1) {
          state.insideFiles = false
          pos = filesEnd + FILES_TAG_CLOSE.length
          continue
        }

        const partialStarts = [
          this.getPartialTagStart(content, 0, FILE_TAG_OPEN),
          this.getPartialTagStart(content, 0, FILES_TAG_CLOSE),
          this.getPartialTagStart(content, 0, ARTIFACT_TAG_CLOSE),
        ].filter(value => value !== -1) as number[]

        if (partialStarts.length > 0) {
          pos = Math.min(...partialStarts)
        }
        else {
          pos = content.length
        }
        break
      }

      // 状态 4: 在 file 内，累积文件内容
      if (state.insideFile) {
        const fileEnd = this.findTagIndex(content, pos, FILE_TAG_CLOSE)
        if (fileEnd === -1) {
          if (state.currentFile && state.currentArtifact) {
            const partialCloseStart = this.getPartialTagStart(
              content,
              state.currentFile.startPosition,
              FILE_TAG_CLOSE,
            )
            const currentContent = content.slice(
              state.currentFile.startPosition,
              partialCloseStart !== -1 ? partialCloseStart : content.length,
            )
            state.currentFile.content = currentContent
            this.callbacks.onFileUpdate?.({
              messageId,
              artifactId: state.currentArtifact.id,
              path: state.currentFile.path,
              language: state.currentFile.language,
              content: unescapeXML(currentContent),
            })
          }
          const partialCloseStart = this.getPartialTagStart(
            content,
            state.currentFile?.startPosition ?? 0,
            FILE_TAG_CLOSE,
          )
          pos = partialCloseStart !== -1 ? partialCloseStart : content.length
          break
        }

        if (state.currentFile) {
          const fileContent = content.slice(
            state.currentFile.startPosition,
            fileEnd,
          )
          const completedFile = {
            path: state.currentFile.path,
            language: state.currentFile.language,
            content: unescapeXML(fileContent),
          }

          state.currentFiles?.files.push(completedFile)
          this.callbacks.onFileComplete?.(completedFile)
        }

        state.insideFile = false
        state.currentFile = null
        pos = fileEnd + FILE_TAG_CLOSE.length
        continue
      }

      // 状态 5: 在 config 内，累积配置内容
      if (state.insideConfig) {
        const configEnd = this.findTagIndex(content, pos, CONFIG_TAG_CLOSE)
        if (configEnd === -1) {
          if (state.currentConfig) {
            state.currentConfig.content = content.slice(pos, content.length)
          }
          const partialCloseStart = this.getPartialTagStart(content, 0, CONFIG_TAG_CLOSE)
          pos = partialCloseStart !== -1 ? partialCloseStart : content.length
          break
        }

        if (state.currentConfig) {
          state.currentConfig.content = content.slice(pos, configEnd)
        }

        state.insideConfig = false
        pos = configEnd + CONFIG_TAG_CLOSE.length

        // 检查 artifact 结束标签
        const artifactEnd = this.findTagIndex(content, pos, ARTIFACT_TAG_CLOSE)
        if (artifactEnd !== -1 && artifactEnd === pos) {
          this.completeArtifact(messageId, state)
          pos = artifactEnd + ARTIFACT_TAG_CLOSE.length
        }
        continue
      }
    }

    state.position = pos
    return content // 返回原始内容，不替换
  }

  /**
   * 完成 artifact 解析
   */
  private completeArtifact(messageId: string, state: ParserState): void {
    if (!state.currentArtifact) {
      return
    }

    let config: Record<string, unknown> | undefined
    if (state.currentConfig?.content) {
      try {
        config = JSON.parse(state.currentConfig.content)
      }
      catch (e) {
        console.error('Failed to parse canvasConfig:', e)
      }
    }

    this.callbacks.onArtifactComplete?.({
      id: state.currentArtifact.id,
      type: state.currentArtifact.type,
      title: state.currentArtifact.title,
      project: {
        entryPath: state.currentFiles?.entryPath || '',
        files: state.currentFiles?.files || [],
      },
      config,
      messageId,
    })

    // 重置状态
    state.insideArtifact = false
    state.insideFiles = false
    state.insideFile = false
    state.insideConfig = false
    state.currentArtifact = null
    state.currentFiles = null
    state.currentFile = null
    state.currentConfig = null
  }

  /**
   * 获取当前正在解析的 artifact（如果有）
   */
  public getPendingArtifact(messageId: string): {
    id: string
    title: string
    type: CanvasType
  } | null {
    const state = this.getState(messageId)
    if (state.currentArtifact && state.insideArtifact) {
      return state.currentArtifact
    }
    return null
  }

  /**
   * 清理所有状态
   */
  public clear(): void {
    this.state.clear()
  }
}

/**
 * 单例实例
 */
let parserInstance: CanvasArtifactParser | null = null

/**
 * 获取解析器单例
 */
export function getCanvasParser(): CanvasArtifactParser {
  if (!parserInstance) {
    parserInstance = new CanvasArtifactParser()
  }
  return parserInstance
}
