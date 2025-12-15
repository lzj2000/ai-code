import type { AIMessage } from '@langchain/core/messages'
import type { ModelConfig } from './utils/modelFactory.js'
import path from 'node:path'
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph'
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import db, { initSessionTable } from './db'
import { createModel } from './utils/modelFactory'
import { createLangChainTools } from './utils/tools'
import '../utils/loadEnv'

export { db }

// 全局缓存：存储不同配置的 workflow
const workflowCache = new Map()

/**
 * 创建聊天机器人 workflow
 * @param config 模型配置
 * @param toolIds 工具 ID 列表
 */
function createWorkflow(config?: ModelConfig, toolIds?: string[]) {
  // 创建模型实例
  const model = createModel(config)

  // 创建工具实例
  const tools = createLangChainTools(toolIds)

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
let checkpointer: SqliteSaver

export function getCheckpointer() {
  if (!checkpointer) {
    // 创建 SQLite 检查点保存器
    try {
      // 初始化自定义 sessions 表
      initSessionTable()
      checkpointer = new SqliteSaver(db)
    }
    catch (error) {
      console.error('SqliteSaver 初始化失败:', error)
      throw error
    }
  }
  return checkpointer
}

// 获取应用实例的函数
async function getApp(config?: ModelConfig, toolIds?: string[]) {
  // 初始化 checkpointer
  if (!checkpointer) {
    getCheckpointer()
  }

  // 生成缓存 key
  const cacheKey = `${config?.modelName || 'default'}-${(toolIds || []).sort().join(',')}`

  // 检查缓存
  if (workflowCache.has(cacheKey)) {
    return workflowCache.get(cacheKey)!
  }

  // 创建新的 workflow
  const workflow = createWorkflow(config, toolIds)
  const app = workflow.compile({ checkpointer })

  // 缓存 workflow（限制缓存大小）
  if (workflowCache.size > 10) {
    const firstKey = workflowCache.keys().next().value
    firstKey && workflowCache.delete(firstKey)
  }

  workflowCache.set(cacheKey, app)

  return app
}

export {
  getApp,
}
