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
 */
export type CanvasLanguage = 'jsx' | 'js' | 'ts' | 'tsx' | 'css' | 'json' | 'txt'

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

export interface CanvasFile {
  path: string
  language: CanvasLanguage
  content: string
}

export interface CanvasProject {
  entryPath: string
  files: CanvasFile[]
}

/**
 * Canvas Artifact 完整数据结构
 */
export interface CanvasArtifact {
  // 元数据
  id: string
  type: CanvasType
  title: string

  project: CanvasProject

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
  insideFiles: boolean
  insideFile: boolean
  insideConfig: boolean

  // 当前正在构建的 artifact
  currentArtifact: {
    id: string
    type: CanvasType
    title: string
  } | null

  currentFiles: {
    entryPath: string
    files: CanvasFile[]
  } | null

  currentFile: {
    path: string
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

  onFileUpdate?: (data: {
    messageId: string
    artifactId: string
    path: string
    language: CanvasLanguage
    content: string
  }) => void

  onFileComplete?: (file: {
    path: string
    language: CanvasLanguage
    content: string
  }) => void

  // Artifact 完成（检测到 </canvasArtifact>）
  onArtifactComplete?: (artifact: {
    id: string
    type: CanvasType
    title: string
    project: CanvasProject
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
