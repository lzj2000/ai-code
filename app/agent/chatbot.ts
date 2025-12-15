import type { AIMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import type { ModelConfig } from './modelFactory.js'
import path from 'node:path'
import process from 'node:process'
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph'
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import Database from 'better-sqlite3'
import { initSessionTable } from './db'
import { createModel } from './modelFactory.js'
import { getAllTools } from './tools'
import '../utils/loadEnv'

// 初始化工具节点
const tools = getAllTools()
const toolNode = new ToolNode(tools)

// 聊天节点：处理用户输入并生成回复
async function chatbotNode(state: typeof MessagesAnnotation.State, config: RunnableConfig) {
  const modelConfig = config.configurable?.modelConfig as ModelConfig

  // 默认配置
  if (!modelConfig) {
    throw new Error('请在设置中配置模型和API Key')
  }

  const model = createModel(modelConfig)
  const response = await model.invoke(state.messages)
  return { messages: [response] }
}

// 定义条件边逻辑
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages
  const lastMessage = messages[messages.length - 1]

  // 如果最后一条消息包含工具调用，则路由到工具节点
  if ((lastMessage as AIMessage).tool_calls?.length) {
    return 'tools'
  }
  // 否则结束流程
  return END
}

const dbPath = path.resolve(process.cwd(), 'chat_history.db')
export const db = new Database(dbPath)
// 构建流式聊天机器人图
const workflow = new StateGraph(MessagesAnnotation)
  .addNode('chatbot', chatbotNode)
  .addNode('tools', toolNode)
  .addEdge(START, 'chatbot')
  .addConditionalEdges('chatbot', shouldContinue)
  .addEdge('tools', 'chatbot')

// 异步初始化检查点保存器和应用
let checkpointer: SqliteSaver
let app: ReturnType<typeof workflow.compile>

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

async function initializeApp() {
  if (!checkpointer) {
    // 创建 SQLite 检查点保存器
    try {
      // 使用 better-sqlite3 创建数据库连接
      const db = new Database(dbPath)
      // 初始化自定义 sessions 表
      initSessionTable()
      checkpointer = new SqliteSaver(db)
    }
    catch (error) {
      console.error('SqliteSaver 初始化失败:', error)
      throw error
    }
  }

  if (!app) {
    app = workflow.compile({ checkpointer })
  }

  return app
}
// initializeApp();
// 获取应用实例的函数
async function getApp() {
  return await initializeApp()
}

export {
  getApp,
}
