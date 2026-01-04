import type { z } from 'zod'

// 工具配置接口
export interface ToolConfig<T = Record<string, unknown>> {
  name: string
  description: string
  enabled: boolean
  schema: z.ZodSchema
  handler: (params?: T) => Promise<string> | string
  options?: Record<string, unknown>
}

// 工具类型
export type ToolType = 'custom' | 'langchain' | 'mcp'

// LangChain 预构建工具配置
export interface LangChainToolConfig {
  importPath: string // 动态导入路径，如 '@langchain/tavily'
  className?: string // 类名，如 'TavilySearch'（可选，默认使用导出的默认值）
  options?: Record<string, unknown> // 工具初始化选项
}

// MCP 服务器配置接口（后端）
export interface MCPServerConfig {
  command: string
  args: string[]
  transport?: 'stdio' | 'sse' | 'http'
  env?: Record<string, string>
}

// 统一工具配置（前端 + 后端）
export interface UnifiedToolConfig {
  // 通用字段
  id: string // 工具唯一标识
  name: string // 显示名称
  description: string // 描述
  icon?: string // 图标 emoji
  enabled: boolean // 是否启用
  type: ToolType // 工具类型：custom | langchain | mcp

  // 自定义工具字段（type = 'custom' 时使用）
  schema?: z.ZodSchema
  handler?: (params?: any) => Promise<string> | string
  options?: Record<string, unknown>

  // LangChain 预构建工具字段（type = 'langchain' 时使用）
  langChainTool?: LangChainToolConfig

  // MCP 工具字段（type = 'mcp' 时使用）
  mcpServer?: string // MCP 服务器名称
  mcpConfig?: MCPServerConfig // MCP 服务器配置
}
