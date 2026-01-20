import type { StructuredTool } from '@langchain/core/tools'
import type { UnifiedToolConfig } from '../types/tool.types'
import { DynamicStructuredTool } from '@langchain/core/tools'
import {
  getMCPServersConfig,
  getToolById,
  unifiedToolsConfig,
} from '../config/tools.config'
import { ensureToolsInitialized } from './tools-init'

/**
 * MCP 工具缓存（避免重复初始化）
 */
let mcpToolsCache: DynamicStructuredTool[] | null = null

/**
 * LangChain 预构建工具缓存
 * 启动时预加载，运行时直接使用
 * 存储任意类型的 LangChain 工具
 */
const langChainToolsCache = new Map<string, StructuredTool>()

/**
 * 预加载所有工具
 * 包括 LangChain 预构建工具和 MCP 工具
 * 应在应用启动时调用
 */
export async function preloadLangChainTools(): Promise<void> {
  // 预加载 LangChain 预构建工具（从配置中动态过滤）
  const langChainToolConfigs = unifiedToolsConfig.filter(
    tool => tool.enabled && tool.type === 'langchain' && tool.langChainTool,
  )

  if (langChainToolConfigs.length === 0) {
     
    console.log('[预加载] 没有 LangChain 预构建工具需要加载')
  }
  else {
    for (const toolConfig of langChainToolConfigs) {
      const { importPath, className, options } = toolConfig.langChainTool!

      try {
        // 动态导入模块
        const importedModule = await import(/* webpackIgnore: true */ importPath)

        // 获取工具类（支持 className 或默认导出）
        let ToolClass
        if (className) {
          ToolClass = importedModule[className]
        }
        else {
          ToolClass = importedModule.default || Object.values(importedModule).find((v: any) => typeof v === 'function')
        }

        if (!ToolClass) {
          console.error(`[预加载] 无法找到工具类: ${importPath}`)
          continue
        }

        // 实例化工具
        const toolInstance = new ToolClass(options)
        langChainToolsCache.set(toolConfig.id, toolInstance)
      }
      catch (error) {
        console.error(`[预加载] 加载失败: ${toolConfig.name}`, error)
      }
    }
  }

  // 预加载 MCP 工具
  await preloadMCPTools()
}

/**
 * 预加载 MCP 工具
 */
export async function preloadMCPTools(): Promise<void> {
  // 如果已经加载过，跳过
  if (mcpToolsCache !== null) {
    return
  }

  const mcpServersConfig = getMCPServersConfig()
  const serverNames = Object.keys(mcpServersConfig)

  if (serverNames.length === 0) {
    return
  }

  try {
    const { MultiServerMCPClient } = await import('@langchain/mcp-adapters')
    const MCP_TIMEOUT = 15000

    // 移除 enabled 字段（MultiServerMCPClient 不需要）
    const serversForClient = Object.fromEntries(
      Object.entries(mcpServersConfig).map(([name, config]) => {
        const { enabled, ...serverConfig } = config as any
        return [name, serverConfig]
      }),
    )

    const mcpClient = new MultiServerMCPClient({
      mcpServers: serversForClient,
    })

    // 设置超时
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('MCP 服务器连接超时')), MCP_TIMEOUT)
    })

    // 获取 MCP 工具，带超时处理
    const tools = await Promise.race([
      mcpClient.getTools(),
      timeoutPromise,
    ]) as DynamicStructuredTool[]

    // 缓存工具
    mcpToolsCache = tools
  }
  catch (error) {
    console.error('[预加载] MCP 工具加载失败:', error)
    mcpToolsCache = [] // 失败时设为空数组，避免重复尝试
  }
}

/**
 * 获取预加载的 LangChain 工具
 */
export function getPreloadedLangChainTool(toolId: string): StructuredTool | null {
  return langChainToolsCache.get(toolId) || null
}

/**
 * 获取所有预加载的 LangChain 工具
 */
export function getAllPreloadedLangChainTools(): StructuredTool[] {
  return Array.from(langChainToolsCache.values())
}

/**
 * 将统一工具配置转换为 LangChain Tool 格式（自定义工具）
 */
function convertCustomToolToLangChain(
  toolConfig: UnifiedToolConfig,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: toolConfig.id,
    description: toolConfig.description,
    schema: toolConfig.schema!,
    func: async (input: any) => {
      try {
        const result = await toolConfig.handler!(input)
        return result
      }
      catch (error) {
        console.error(`[工具] ${toolConfig.name} 执行失败:`, error)
        return `工具执行失败: ${error instanceof Error ? error.message : String(error)}`
      }
    },
  })
}

/**
 * 获取预加载的 MCP 工具
 */
export function getPreloadedMCPTools(): DynamicStructuredTool[] {
  return mcpToolsCache || []
}

/**
 * 清除 MCP 工具缓存
 */
export function clearMCPToolsCache(): void {
  mcpToolsCache = null
}

/**
 * 根据工具 ID 列表创建 LangChain 工具数组
 * 支持自定义工具、LangChain 预构建工具和 MCP 工具混合使用
 *
 * @param toolIds 工具 ID 列表（如 ['calculator', 'tavily', 'filesystem']）
 * @returns LangChain Tool 数组
 */
export async function createLangChainTools(
  toolIds?: string[],
): Promise<StructuredTool[]> {
  if (!toolIds || toolIds.length === 0) {
    return []
  }

  await ensureToolsInitialized().catch(() => {})

  const tools: StructuredTool[] = []
  const needsMCPTools = toolIds.some((id) => {
    const config = getToolById(id)
    return config?.type === 'mcp'
  })

  // 1. 处理非 MCP 工具
  for (const toolId of toolIds) {
    const toolConfig = getToolById(toolId)

    if (!toolConfig) {
      console.warn(`[工具] 配置不存在: ${toolId}`)
      continue
    }

    if (!toolConfig.enabled) {
      console.warn(`[工具] 未启用: ${toolId}`)
      continue
    }

    if (toolConfig.type === 'mcp' || toolConfig.type === 'canvas') {
      continue // MCP 和 Canvas 工具统一处理
    }

    if (toolConfig.langChainTool) {
      // LangChain 预构建工具：从缓存获取
      const preloadedTool = getPreloadedLangChainTool(toolId)
      if (preloadedTool) {
        tools.push(preloadedTool)
      }
      else {
        console.warn(`[工具] 预加载工具未找到: ${toolConfig.name}`)
      }
    }
    else {
      // 自定义工具：直接转换
      tools.push(convertCustomToolToLangChain(toolConfig))
    }
  }

  // 2. 如果需要 MCP 工具，从缓存获取
  if (needsMCPTools) {
    const mcpTools = getPreloadedMCPTools()
    if (mcpTools.length > 0) {
      tools.push(...mcpTools)
    }
    else {
      console.warn('[工具] MCP 工具未预加载或加载失败')
    }
  }

  return tools
}

export const getToolUsagePrompt = () => `## 工具调用规范

**仅在需要调用工具时才说明**: 只有当你接下来确实要调用工具时，才在调用前用一句话说明意图；如果本轮不调用任何工具，不要输出这句说明，直接回答用户。

**说明句要求**:
- 只输出 1 句，且只出现 1 次（禁止重复、复读或多段同义改写）
- 简洁自然，建议 20 字以内
- 不需要暴露具体工具名称，用用户能理解的动作描述
- 说明后直接调用工具，不要等待用户确认

**示例**:
- "我来搜索一下相关信息。" → 然后调用搜索类工具
- "我来读取你提到的文件。" → 然后调用读取类工具
- "我来运行一下项目检查。" → 然后调用命令执行类工具
`;

// 导出类型
export type { UnifiedToolConfig }
