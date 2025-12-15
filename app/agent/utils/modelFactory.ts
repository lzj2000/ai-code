import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatOpenAI } from '@langchain/openai'

export type ModelProvider = 'openai' | 'google' | 'qwen'

export interface ModelConfig {
  provider: ModelProvider
  modelName: string
  apiKey?: string
  baseUrl?: string
}

const defaultModelConfig: ModelConfig = {
  provider: 'openai',
  modelName: 'gpt-3.5-turbo',
}

export function createModel(config?: ModelConfig): BaseChatModel {
  let model: BaseChatModel
  if (!config) {
    config = defaultModelConfig
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

  return model
}
