import type { BaseLanguageModelInput } from '@langchain/core/language_models/base'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { AIMessageChunk } from '@langchain/core/messages'
import type { Runnable } from '@langchain/core/runnables'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatOpenAI } from '@langchain/openai'
import { getAllTools } from '../tools'

export type ModelProvider = 'openai' | 'google' | 'qwen'

export interface ModelConfig {
  provider: ModelProvider
  modelName: string
  apiKey?: string
  baseUrl?: string
}

export function createModel(config: ModelConfig): Runnable<BaseLanguageModelInput, AIMessageChunk> {
  const tools = getAllTools()
  let model: BaseChatModel

  if (!config.apiKey) {
    throw new Error(`请提供 ${config.provider} 的 API Key`)
  }

  switch (config.provider) {
    case 'google':
      model = new ChatGoogleGenerativeAI({
        model: config.modelName || 'gemini-pro',
        apiKey: config.apiKey,
        streaming: true,
      })
      break
    case 'qwen':
      model = new ChatOpenAI({
        model: config.modelName || 'qwen-plus',
        apiKey: config.apiKey,
        configuration: {
          baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        },
        streaming: true,
      })
      break
    case 'openai':
    default:
      model = new ChatOpenAI({
        model: config.modelName || 'gpt-3.5-turbo',
        apiKey: config.apiKey,
        streaming: true,
      })
      break
  }

  // Bind tools to the model
  if (model.bindTools) {
    return model.bindTools(tools)
  }

  return model
}
