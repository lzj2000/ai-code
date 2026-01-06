import type { AIMessage } from '@langchain/core/messages'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModelConfig } from './utils/modelFactory.js'
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { SupabaseSaver } from '@skroyc/langgraph-supabase-checkpointer'
import { supabase } from '../database/supabase'
import { createModel } from './utils/modelFactory'
import { createLangChainTools } from './utils/tools'
import '../utils/loadEnv'

// 全局缓存：存储 workflow 与匿名编译后的 app
// 使用 any 避免 CompiledStateGraph 复杂类型推断问题
const workflowCache = new Map<string, any>()
const appCache = new Map<string, any>()

/**
 * 创建聊天机器人 workflow
 * @param config 模型配置
 * @param toolIds 工具 ID 列表
 */
async function createWorkflow(config?: ModelConfig, toolIds?: string[]) {
  // 创建模型实例
  const model = createModel(config)

  // 创建工具实例
  const tools = await createLangChainTools(toolIds)

  // 绑定工具到模型
  const modelWithTools = tools.length > 0 ? model.bindTools!(tools) : model

  // 聊天节点：处理用户输入并生成回复
  async function chatbotNode(state: typeof MessagesAnnotation.State) {
    try {
      const response = await modelWithTools.invoke(state.messages)
      return { messages: [response] }
    }
    catch (error) {
      console.error('chatbotNode 错误详情:', error)
      console.error('错误栈:', error instanceof Error ? error.stack : '无栈信息')
      throw error
    }
  }

  // 判断是否需要调用工具
  function shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1]

    // 检查最后一条消息是否包含 tool_calls
    if (lastMessage && lastMessage._getType() === 'ai') {
      const aiMessage = lastMessage as AIMessage
      if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        return 'tools'
      }
    }

    return END
  }

  // 构建 workflow
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode('chatbot', chatbotNode)

  // 如果有工具，添加工具节点和条件路由
  if (tools.length > 0) {
    const toolNode = new ToolNode(tools)
    workflow
      .addNode('tools', toolNode)
      .addEdge(START, 'chatbot')
      .addConditionalEdges('chatbot', shouldContinue, {
        tools: 'tools',
        [END]: END,
      })
      .addEdge('tools', 'chatbot')
  }
  else {
    // 无工具，直接连接
    workflow.addEdge(START, 'chatbot').addEdge('chatbot', END)
  }

  return workflow
}

// 异步初始化检查点保存器和应用
let checkpointer: SupabaseSaver

function getCheckpointer(client?: SupabaseClient, userId?: string) {
  if (client) {
    return new SupabaseSaver(client, undefined, userId)
  }

  if (!checkpointer) {
    // 创建 Supabase 检查点保存器
    try {
      checkpointer = new SupabaseSaver(supabase)
    }
    catch (error) {
      console.error('SupabaseSaver 初始化失败:', error)
      throw error
    }
  }
  return checkpointer
}

// 获取应用实例的函数
async function getApp(config?: ModelConfig, toolIds?: string[], client?: SupabaseClient, userId?: string) {
  const checkpointerInstance = getCheckpointer(client, userId)

  // 生成缓存 key
  const cacheKey = `${config?.modelName || 'default'}-${(toolIds || []).sort().join(',')}`

  // 检查缓存
  let workflow = workflowCache.get(cacheKey)

  if (!workflow) {
    // 创建新的 workflow
    workflow = await createWorkflow(config, toolIds)

    // FIFO 缓存清理：如果缓存超过 10 个，删除最早添加的 workflow
    if (workflowCache.size > 10) {
      const firstKey = workflowCache.keys().next().value // Map 按插入顺序迭代
      if (firstKey) {
        workflowCache.delete(firstKey)
        appCache.delete(firstKey)
      }
    }

    workflowCache.set(cacheKey, workflow)
  }

  if (!client && appCache.has(cacheKey)) {
    return appCache.get(cacheKey)!
  }

  const app = workflow.compile({ checkpointer: checkpointerInstance })

  if (!client) {
    appCache.set(cacheKey, app)
  }

  return app
}

export {
  getApp,
}
