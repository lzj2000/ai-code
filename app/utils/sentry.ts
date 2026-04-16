import * as Sentry from '@sentry/nextjs'
import type { ModelConfig } from '@/app/agent/utils/modelFactory'

interface ChatObservationContext {
  stage: string
  threadId?: string
  userId?: string
  modelConfig?: ModelConfig
  selectedTools?: string[]
  eventName?: string
}

export function createChatObservationAttributes(input: ChatObservationContext) {
  return {
    'watchtower.stage': input.stage,
    'watchtower.route': '/api/chat',
    'watchtower.thread_id': input.threadId ?? 'pending',
    'watchtower.user_id_present': Boolean(input.userId),
    'watchtower.model_name': input.modelConfig?.modelName ?? 'default',
    'watchtower.model_provider': input.modelConfig?.provider ?? 'unspecified',
    'watchtower.selected_tools_count': input.selectedTools?.length ?? 0,
    'watchtower.event_name': input.eventName ?? 'none',
  }
}

export function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error)
  }
  catch {
    return 'Unknown error'
  }
}

export function captureChatException(error: unknown, input: ChatObservationContext) {
  Sentry.withScope((scope) => {
    scope.setTag('watchtower.route', '/api/chat')
    scope.setTag('watchtower.stage', input.stage)

    if (input.eventName) {
      scope.setTag('watchtower.event_name', input.eventName)
    }

    if (input.userId) {
      scope.setUser({ id: input.userId })
    }

    scope.setContext('chat_observation', {
      threadId: input.threadId ?? null,
      modelName: input.modelConfig?.modelName ?? null,
      modelProvider: input.modelConfig?.provider ?? null,
      selectedTools: input.selectedTools ?? [],
    })

    Sentry.captureException(error)
  })
}
