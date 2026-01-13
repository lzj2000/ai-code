/**
 * Canvas 功能类型定义
 *
 * 定义 Canvas Artifact 的所有数据结构和类型
 */

/**
 * Artifact 类型（决定如何执行）
 * react: React 组件
 * component: 通用组件别名（等同于 react）
 */
export type CanvasType = 'react' | 'component'

/**
 * 代码语言（语法高亮）
 * 当前版本仅支持 JSX
 */
export type CanvasLanguage = 'jsx'

/**
 * Artifact 状态
 */
export type CanvasStatus = 'creating' | 'streaming' | 'ready' | 'executing' | 'error'

/**
 * Artifact 配置（可选，未来扩展）
 */
export interface CanvasConfig {
  autoExecute?: boolean
  dependencies?: string[]
  theme?: 'light' | 'dark'
}

/**
 * Artifact 代码信息
 */
export interface CanvasCode {
  language: CanvasLanguage
  content: string
}

/**
 * Canvas Artifact 完整数据结构
 */
export interface CanvasArtifact {
  // 元数据
  id: string
  type: CanvasType
  title: string

  // 代码信息
  code: CanvasCode

  // 配置（可选）
  config?: CanvasConfig

  // 状态信息
  status: CanvasStatus
  isStreaming: boolean

  // 关联信息
  messageId: string
  sessionId: string

  // 版本信息
  currentVersion: number

  // 时间戳
  createdAt: Date
  updatedAt: Date

  // 执行结果（可选）
  executionResult?: {
    output: unknown
    error: string
    console: string[]
  }
}

/**
 * 解析器状态
 */
export interface ParserState {
  // 解析位置
  position: number

  // 嵌套状态标志
  insideArtifact: boolean
  insideCode: boolean
  insideConfig: boolean

  // 当前正在构建的 artifact
  currentArtifact: {
    id: string
    type: CanvasType
    title: string
  } | null

  // 当前正在累积的代码
  currentCode: {
    language: CanvasLanguage
    content: string
    startPosition: number
  } | null

  // 当前配置（可选）
  currentConfig: {
    content: string
  } | null

  // 缓冲区
  fullContent: string

  // 消息上下文
  messageId: string
}

/**
 * 解析器回调接口
 */
export interface ParserCallbacks {
  // Artifact 开始（检测到开始标签）
  onArtifactStart?: (metadata: {
    id: string
    type: CanvasType
    title: string
    messageId: string
  }) => void

  // 代码流式更新（代码内容累积时，实时触发）
  onCodeUpdate?: (data: {
    messageId: string
    artifactId: string
    language: CanvasLanguage
    content: string // 当前累积的代码
  }) => void

  // 代码完成（检测到 </canvasCode>）
  onCodeComplete?: (code: {
    language: CanvasLanguage
    content: string
  }) => void

  // Artifact 完成（检测到 </canvasArtifact>）
  onArtifactComplete?: (artifact: {
    id: string
    type: CanvasType
    title: string
    code: CanvasCode
    config?: Record<string, unknown>
    messageId: string
  }) => void

  // 解析错误
  onError?: (error: {
    message: string
    position: number
    context: string
  }) => void
}

/**
 * 版本信息（用于显示）
 */
export interface VersionInfo {
  version: number
  code: string
  description?: string
  createdAt: Date
}
