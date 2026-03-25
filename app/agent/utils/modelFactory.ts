import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatOpenAI } from '@langchain/openai'
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from './models'

export type ModelProvider = 'openai' | 'google' | 'glm' | 'qwen'

export interface ModelConfig {
  provider?: ModelProvider
  modelName: string
  baseUrl?: string
  apiKeyEnv?: 'OPENAI_API_KEY' | 'QWEN_API_KEY' | 'GOOGLE_API_KEY' | 'GLM_API_KEY'
}

const defaultModelConfig: ModelConfig = {
  modelName: DEFAULT_MODEL_ID,
}

function resolveAiBaseUrl(baseUrl?: string) {
  return process.env.AI_BASE_URL || baseUrl
}

export function createModel(config?: ModelConfig): BaseChatModel {
  let model: BaseChatModel
  if (!config) {
    config = defaultModelConfig
  }

  // 1. 尝试从预定义模型列表中查找配置
  const predefinedModel = AVAILABLE_MODELS.find(m => m.id === config?.modelName)

  // 2. 解析模型 ID 和 Provider
  let provider = config.provider
  let realModelName = config.modelName
  let baseUrl = config.baseUrl
  let apiKeyEnv = config.apiKeyEnv

  // 如果是预定义模型，使用预定义的配置
  if (predefinedModel) {
    provider = predefinedModel.provider
    baseUrl = predefinedModel.baseUrl
    apiKeyEnv = predefinedModel.apiKeyEnv
    // 移除前缀 (google: 或 openai:)
    const parts = predefinedModel.id.split(':')
    if (parts.length > 1) {
      realModelName = parts.slice(1).join(':')
    }
  }
  else {
    // 尝试根据前缀解析
    if (realModelName.startsWith('google:')) {
      provider = 'google'
      realModelName = realModelName.replace('google:', '')
    }
    else if (realModelName.startsWith('openai:')) {
      provider = 'openai'
      realModelName = realModelName.replace('openai:', '')
    }
    else if (realModelName.startsWith('glm:')) {
      provider = 'glm'
      realModelName = realModelName.replace('glm:', '')
      baseUrl = process.env.AI_BASE_URL || baseUrl || process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
      apiKeyEnv = apiKeyEnv || 'GLM_API_KEY'
    }
  }

  // 3. 根据 Provider 实例化模型
  switch (provider) {
    case 'google':
      model = new ChatGoogleGenerativeAI({
        model: realModelName || 'gemini-2.5-flash',
        apiKey: process.env.GOOGLE_API_KEY || '',
        streaming: true,
      })
      break

    case 'glm':
    case 'openai':
    default:
      // 确定 OpenAI 兼容模型的 Base URL 与 API Key
      if (provider === 'glm') {
        baseUrl = process.env.AI_BASE_URL || baseUrl || process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
        apiKeyEnv = apiKeyEnv || 'GLM_API_KEY'
      }

      baseUrl = resolveAiBaseUrl(baseUrl)

      const apiKey = apiKeyEnv
        ? (process.env[apiKeyEnv] || '')
        : (process.env.OPENAI_API_KEY || '')

      model = new ChatOpenAI({
        model: realModelName || 'gpt-3.5-turbo',
        apiKey,
        configuration: baseUrl
          ? {
              baseURL: baseUrl,
            }
          : undefined,
        streaming: true,
      })
      break
  }

  return model
}
