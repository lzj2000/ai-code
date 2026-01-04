import type { UnifiedToolConfig } from '../types/tool.types'
import { calculatorTool } from '../tools/calculator.tool'
import { currentTimeTool } from '../tools/current-time.tool'

/**
 * 统一工具配置
 * 三种工具类型：custom（自定义）、langchain（LangChain 预构建）、mcp（MCP 工具）
 *
 * 前端：用于工具选择器显示
 * 后端：用于加载和初始化工具
 */
export const unifiedToolsConfig: UnifiedToolConfig[] = [
  // ==================== 自定义工具 ====================
  {
    id: 'calculator',
    name: '计算器',
    description: '执行数学计算，支持基本运算和复杂表达式',
    icon: '🔢',
    enabled: true,
    type: 'custom',
    schema: calculatorTool.schema,
    handler: calculatorTool.handler,
  },
  {
    id: 'current_time',
    name: '当前时间',
    description: '获取当前日期和时间',
    icon: '🕐',
    enabled: true,
    type: 'custom',
    schema: currentTimeTool.schema,
    handler: currentTimeTool.handler,
  },

  // ==================== LangChain 预构建工具 ====================
  // 工具列表: https://docs.langchain.com/oss/javascript/integrations/tools
  {
    id: 'tavily',
    name: 'Tavily 搜索',
    description: '使用 Tavily API 进行真实网络搜索',
    icon: '🌐',
    enabled: true,
    type: 'langchain',
    langChainTool: {
      importPath: '@langchain/tavily',
      className: 'TavilySearch',
      options: {
        maxResults: 5,
        searchDepth: 'basic',
        includeAnswer: true,
        includeRawContent: false,
        includeImages: false,
      },
    },
  },

  // ==================== MCP 工具 ====================
  {
    id: 'sequential-thinking',
    name: '顺序思考',
    description: '通过结构化的思考过程帮助 AI 解决复杂问题',
    icon: '🧠',
    enabled: true,
    type: 'mcp',
    mcpServer: 'server-sequential-thinking',
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      transport: 'stdio',
    },
  },
  // {
  //   id: 'filesystem',
  //   name: '文件系统',
  //   description: '访问和操作 public 目录下的文件',
  //   icon: '📁',
  //   enabled: true,
  //   type: 'mcp',
  //   mcpServer: 'filesystem',
  //   mcpConfig: {
  //     command: 'npx',
  //     args: ['-y', '@modelcontextprotocol/server-filesystem', path.join(process.cwd(), 'public')],
  //     transport: 'stdio',
  //   },
  // },
  // {
  //   id: 'playwright',
  //   name: '浏览器自动化',
  //   description: '使用 Playwright 进行浏览器自动化操作',
  //   icon: '🌐',
  //   enabled: false,
  //   type: 'mcp',
  //   mcpServer: 'playwright',
  //   mcpConfig: {
  //     command: 'npx',
  //     args: ['-y', '@playwright/mcp@latest'],
  //     transport: 'stdio',
  //   },
  // },
]

/**
 * 获取所有启用的工具配置
 */
export function getEnabledTools(): UnifiedToolConfig[] {
  return unifiedToolsConfig.filter(tool => tool.enabled)
}

/**
 * 获取自定义工具配置（type = 'custom'）
 */
export function getCustomTools(): UnifiedToolConfig[] {
  return unifiedToolsConfig.filter(tool => tool.type === 'custom' && tool.enabled)
}

/**
 * 获取 LangChain 工具配置（type = 'langchain'）
 */
export function getLangChainTools(): UnifiedToolConfig[] {
  return unifiedToolsConfig.filter(tool => tool.type === 'langchain' && tool.enabled)
}

/**
 * 获取 MCP 工具配置（type = 'mcp'）
 */
export function getMCPTools(): UnifiedToolConfig[] {
  return unifiedToolsConfig.filter(tool => tool.type === 'mcp' && tool.enabled)
}

/**
 * 根据 ID 获取工具配置
 */
export function getToolById(id: string): UnifiedToolConfig | undefined {
  return unifiedToolsConfig.find(tool => tool.id === id)
}

/**
 * 获取 MCP 服务器配置（用于 MultiServerMCPClient）
 */
export function getMCPServersConfig(): Record<string, {
  command: string
  args: string[]
  transport?: 'stdio' | 'sse' | 'http'
}> {
  const mcpTools = getMCPTools()
  const config: Record<string, any> = {}

  for (const tool of mcpTools) {
    if (tool.mcpServer && tool.mcpConfig) {
      config[tool.mcpServer] = {
        command: tool.mcpConfig.command,
        args: tool.mcpConfig.args,
        transport: tool.mcpConfig.transport || 'stdio',
      }
    }
  }

  return config
}

/**
 * 获取环境配置中默认启用的工具 ID 列表
 */
export const environmentDefaults = {
  development: ['calculator', 'current_time', 'tavily', 'sequential-thinking'],
  production: ['calculator', 'current_time', 'tavily', 'sequential-thinking'],
  test: ['calculator', 'current_time'],
}

/**
 * 获取当前环境的默认工具列表
 */
export function getDefaultToolsForEnv(env: string = process.env.NODE_ENV || 'development'): string[] {
  return environmentDefaults[env as keyof typeof environmentDefaults] || environmentDefaults.development
}
